import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import type { BeautifiedContent } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';
import PlatformCard from '../components/publish/PlatformCard';
import PublishButton from '../components/publish/PublishButton';
import ToastContainer, { showToast } from '../components/publish/Toast';
import { publishToPlatform, checkExtensionHealth } from '../utils/extensionBridge';
import { useExtensionStatus } from '../hooks/useExtensionStatus';
import { generateTitle, suggestTags } from '../services/deepseek';
import { api } from '../api/client';
import type { PlatformType } from '../adapters/types';

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

function ExtensionIndicator() {
  const extStatus = useExtensionStatus();

  if (extStatus.checking) {
    return (
      <span className="px-tag border-amber-300/40 bg-amber-100/60 text-amber-700">
        <span className="px-dot bg-amber-500 px-blink" /> Checking extension
      </span>
    );
  }

  if (extStatus.available) {
    return (
      <span className="px-tag border-emerald-300/40 bg-emerald-100/60 text-emerald-700">
        <span className="px-dot bg-emerald-500" /> Extension live{extStatus.version ? ` v${extStatus.version}` : ''}
      </span>
    );
  }

  return (
    <span className="px-tag border-red-300/40 bg-red-100/70 text-red-700">
      <span className="px-dot bg-red-500" /> Extension offline
    </span>
  );
}

export default function Editor() {
  const navigate = useNavigate();
  const {
    draft,
    setDraft,
    loadDemo,
    selectedPlatforms,
    platformStates,
    togglePlatform,
    setPlatformPublishStatus,
    resetPublishStates,
    beautifiedOutputs,
    setBeautifiedOutput,
    applyBeautifiedContent,
  } = useContentStore();

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const handleEditorChange = useCallback((html: string, _text: string) => {
    setDraft({ htmlContent: html });
    setError('');
  }, [setDraft]);

  const handleAiTitle = async () => {
    setAiLoading('title');
    try {
      const titles = await generateTitle(draft.htmlContent);
      if (titles.length > 0) setDraft({ title: titles[0] });
      showToast('success', '标题已生成', `共 ${titles.length} 个候选`);
    } catch (err) {
      showToast('error', '标题生成失败', err instanceof Error ? err.message : '');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiTags = async () => {
    setAiLoading('tags');
    try {
      const tags = await suggestTags(draft.title, draft.htmlContent);
      if (tags.length > 0) setDraft({ tags: tags.join(', ') });
      showToast('success', '标签已生成', tags.join('、'));
    } catch (err) {
      showToast('error', '标签生成失败', err instanceof Error ? err.message : '');
    } finally {
      setAiLoading(null);
    }
  };

  const handleBeautifyStart = useCallback((_platform: PlatformType) => {}, []);

  const handleBeautifyComplete = useCallback((platform: PlatformType) => (result: BeautifiedContent) => {
    setBeautifiedOutput(platform, result);
    const state = platformStates.get(platform);
    showToast('success', `${state?.platformName || platform} 美化完成`, '点击 APPLY 应用到发布内容');
  }, [platformStates, setBeautifiedOutput]);

  const handleBeautifyError = useCallback((platform: PlatformType) => (errorMsg: string) => {
    const state = platformStates.get(platform);
    showToast('error', `${state?.platformName || platform} 美化失败`, errorMsg);
  }, [platformStates]);

  const handleApplyBeautified = useCallback((platform: PlatformType) => () => {
    const beautified = beautifiedOutputs.get(platform);
    if (!beautified) return;
    applyBeautifiedContent(platform, beautified.title, beautified.htmlBody, beautified.tags);
    const state = platformStates.get(platform);
    showToast('success', `${state?.platformName || platform} 已应用`, '美化内容已写入平台输出');
  }, [beautifiedOutputs, applyBeautifiedContent, platformStates]);

  const handleSaveToBackend = async () => {
    if (!draft.title.trim()) {
      setError('请输入标题');
      return;
    }

    setSaving(true);
    try {
      const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      const content = await api.createContent({
        title: draft.title,
        rawMarkdown: draft.htmlContent,
        tags,
        coverImage: draft.coverImage || undefined,
      });
      await api.adaptContent(content.id, Array.from(selectedPlatforms));
      navigate(`/contents/${content.id}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const selected = allPlatforms.filter((platform) => selectedPlatforms.has(platform));
    if (selected.length === 0) {
      setError('请至少选择一个平台');
      return;
    }
    if (!draft.title.trim() || !draft.htmlContent.replace(/<[^>]*>/g, '').trim()) {
      setError('标题和正文不能为空');
      return;
    }

    const health = await checkExtensionHealth();
    if (!health.connected) {
      showToast('error', '扩展未连接', '请确保已安装并启用 MultiPublish 扩展，然后刷新页面重试。');
      return;
    }

    setError('');
    resetPublishStates();

    for (const platform of selected) {
      const state = platformStates.get(platform);
      if (!state) continue;

      setPlatformPublishStatus(platform, 'publishing');
      try {
        const result = await publishToPlatform({
          platform,
          platformName: state.platformName,
          content: state.output,
          autoLayout: true,
        });

        if (result.status === 'success') {
          setPlatformPublishStatus(platform, 'success', result.message);
          showToast('success', `${state.platformName} 发布成功`, result.message);
        } else {
          setPlatformPublishStatus(platform, 'failed', result.message);
          showToast('error', `${state.platformName} 发布失败`, result.message);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '未知错误';
        setPlatformPublishStatus(platform, 'failed', message);
        showToast('error', `${state.platformName} 发布失败`, message);
      }
    }
  };

  const publishing = Array.from(platformStates.values()).some((state) => state.status === 'publishing');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <ToastContainer />
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="px-card px-paper p-6 md:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <button onClick={() => navigate('/')} className="px-btn-ghost -ml-3 w-fit">
                <ArrowLeft size={14} />
                Back to overview
              </button>
              <div className="space-y-3">
                <div className="px-label">Writing desk</div>
                <h1 className="font-['Cormorant_Garamond'] text-[58px] leading-[0.9] tracking-[-0.07em] text-[var(--ink)]">
                  Shape the original draft,
                  <br />
                  then tune each destination.
                </h1>
                <p className="max-w-[680px] text-[14px] leading-7 text-[var(--ink-soft)]">
                  The composition area stays generous and calm. Platform constraints, AI polish, and extension status sit beside the manuscript instead of fighting for attention.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ExtensionIndicator />
              <button onClick={loadDemo} className="px-btn-secondary">Load demo</button>
              <button onClick={handleAiTitle} disabled={!!aiLoading} className="px-btn-ghost">
                {aiLoading === 'title' ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                AI title
              </button>
              <button onClick={handleAiTags} disabled={!!aiLoading} className="px-btn-ghost">
                {aiLoading === 'tags' ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                AI tags
              </button>
              <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-primary">
                <Save size={13} />
                {saving ? 'Saving' : 'Save preview'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)_360px]">
          <aside className="px-card px-soft-panel p-5 md:p-6">
            <div className="px-label mb-4">Draft metadata</div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  Title
                </div>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => {
                    setDraft({ title: event.target.value });
                    setError('');
                  }}
                  placeholder="Give this piece a headline"
                  className="px-input"
                />
              </div>

              <div>
                <div className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  Tags
                </div>
                <input
                  type="text"
                  value={draft.tags}
                  onChange={(event) => setDraft({ tags: event.target.value })}
                  placeholder="Design, workflow, creator tools"
                  className="px-input"
                />
              </div>

              <div>
                <div className="mb-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  Cover URL
                </div>
                <input
                  type="text"
                  value={draft.coverImage}
                  onChange={(event) => setDraft({ coverImage: event.target.value })}
                  placeholder="Optional cover asset"
                  className="px-input"
                />
              </div>
            </div>

            <div className="my-6 px-divider" />

            <div className="space-y-4">
              <div className="px-label">Notes</div>
              <p className="text-[13px] leading-7 text-[var(--ink-soft)]">
                Save generates server-side platform previews. Publish sends those outputs through the real extension bridge.
              </p>

              <div className="rounded-[22px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.72)] p-4">
                <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  Active targets
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allPlatforms.map((platform) => {
                    const state = platformStates.get(platform);
                    return (
                      <span key={platform} className={`px-tag ${selectedPlatforms.has(platform) ? '' : 'opacity-45'}`}>
                        {state?.platformName || platform}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div className="px-card px-paper overflow-hidden">
            <div className="border-b border-[rgba(120,104,89,0.12)] px-6 py-5 md:px-8">
              <div className="px-label mb-3">Manuscript</div>
              <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                The original voice lives here.
              </p>
            </div>
            <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6">
              <TiptapEditor
                content={draft.htmlContent}
                placeholder="Start with a strong opening, then let the platform adaptations follow."
                onChange={handleEditorChange}
              />
            </div>
          </div>

          <div className="px-card px-soft-panel flex min-h-[780px] flex-col p-5 md:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="px-label mb-3">Platform outputs</div>
                <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  Tune each channel.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-[22px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.62)] px-4 py-4">
              <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                Publish guidance
              </div>
              <p className="mt-3 text-[13px] leading-7 text-[var(--ink-soft)]">
                Select the channels you want active, inspect validation notes, then publish from the footer when the extension is online.
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {allPlatforms.map((platform) => {
                const state = platformStates.get(platform);
                if (!state) return null;
                return (
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    platformName={state.platformName}
                    selected={selectedPlatforms.has(platform)}
                    onToggle={() => togglePlatform(platform)}
                    status={state.status}
                    statusMessage={state.message}
                    titleCount={state.meta.titleCharCount}
                    titleMax={state.meta.maxTitleLength}
                    bodyCount={state.meta.bodyCharCount}
                    bodyMax={state.meta.maxBodyLength}
                    tagCount={state.meta.tagCount}
                    tagMax={state.meta.maxTags}
                    messages={state.validation.messages}
                    previewBody={state.output.body}
                    previewTags={state.output.tags}
                    draftTitle={draft.title}
                    draftHtmlContent={draft.htmlContent}
                    beautifiedContent={beautifiedOutputs.get(platform)}
                    onBeautifyStart={() => handleBeautifyStart(platform)}
                    onBeautifyComplete={handleBeautifyComplete(platform)}
                    onBeautifyError={handleBeautifyError(platform)}
                    onApplyBeautified={handleApplyBeautified(platform)}
                  />
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
                <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]">
                  <AlertCircle size={12} />
                  Validation
                </div>
                <p className="mt-2 leading-6">{error}</p>
              </div>
            )}

            <div className="mt-4 border-t border-[rgba(120,104,89,0.12)] pt-4">
              <PublishButton
                publishing={publishing}
                selectedCount={Array.from(selectedPlatforms).length}
                platformStatuses={new Map(Array.from(selectedPlatforms).map((platform) => [platform, platformStates.get(platform)?.status || 'idle']))}
                onPublish={handlePublish}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
