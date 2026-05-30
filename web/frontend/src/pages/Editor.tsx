import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
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
  if (extStatus.checking) return <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent-deep)]"><span className="px-dot bg-[var(--accent)] px-blink" /> 检查扩展中</span>;
  if (extStatus.available) return <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent-deep)]"><span className="px-dot bg-[var(--accent)]" /> 扩展已连接{extStatus.version ? ` v${extStatus.version}` : ''}</span>;
  return <span className="px-tag border-red-300/40 bg-red-100/70 text-red-700"><span className="px-dot bg-red-500" /> 扩展未连接</span>;
}

type EditorStep = 'draft' | 'platform';

export default function Editor() {
  const navigate = useNavigate();
  const [step, setStep] = useState<EditorStep>('draft');
  const {
    draft, setDraft, loadDemo,
    selectedPlatforms, platformStates, togglePlatform,
    setPlatformPublishStatus, resetPublishStates,
    beautifiedOutputs, setBeautifiedOutput, applyBeautifiedContent,
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
      showToast('success', '标题已生成', `生成了 ${titles.length} 个候选标题`);
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
    showToast('success', `${state?.platformName || platform} 已美化`, '可以在卡片里应用到当前平台版本');
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
    showToast('success', `${state?.platformName || platform} 已应用`, '美化内容已经写入当前平台输出');
  }, [beautifiedOutputs, applyBeautifiedContent, platformStates]);

  const handleGoToPlatform = () => {
    if (!draft.title.trim()) { setError('请输入标题'); return; }
    if (!draft.htmlContent.replace(/<[^>]*>/g, '').trim()) { setError('正文不能为空'); return; }
    setError('');
    setStep('platform');
  };

  const handleSaveToBackend = async () => {
    if (!draft.title.trim()) { setError('请输入标题'); return; }
    setSaving(true);
    try {
      const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      const content = await api.createContent({
        title: draft.title, rawMarkdown: draft.htmlContent, tags,
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
    const selected = allPlatforms.filter((p) => selectedPlatforms.has(p));
    if (selected.length === 0) { setError('请至少选择一个平台'); return; }
    if (!draft.title.trim() || !draft.htmlContent.replace(/<[^>]*>/g, '').trim()) { setError('标题和正文不能为空'); return; }
    const health = await checkExtensionHealth();
    if (!health.connected) { showToast('error', '扩展未连接', '请先安装并启用 MultiPublish 扩展'); return; }
    setError('');
    resetPublishStates();
    for (const platform of selected) {
      const state = platformStates.get(platform);
      if (!state) continue;
      setPlatformPublishStatus(platform, 'publishing');
      try {
        const result = await publishToPlatform({ platform, platformName: state.platformName, content: state.output, autoLayout: true });
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

  const publishing = Array.from(platformStates.values()).some((s) => s.status === 'publishing');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <ToastContainer />

      {step === 'draft' && (
        <div className="mx-auto flex max-w-[960px] flex-col">
          <div className="flex items-center justify-between px-6 py-5">
            <button onClick={() => navigate('/')} className="px-btn-ghost -ml-3">
              <ArrowLeft size={14} /> 返回工作台
            </button>
            <div className="flex items-center gap-3">
              <ExtensionIndicator />
              <button onClick={loadDemo} className="px-btn-secondary">载入示例</button>
              <button onClick={handleAiTitle} disabled={!!aiLoading} className="px-btn-ghost">
                {aiLoading === 'title' ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                标题建议
              </button>
              <button onClick={handleAiTags} disabled={!!aiLoading} className="px-btn-ghost">
                {aiLoading === 'tags' ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                标签建议
              </button>
            </div>
          </div>

          <div className="px-6">
            <input
              type="text"
              value={draft.title}
              onChange={(e) => { setDraft({ title: e.target.value }); setError(''); }}
              placeholder="输入标题"
              className="w-full border-none bg-transparent font-['Cormorant_Garamond'] text-[42px] leading-[1.1] tracking-[-0.06em] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
            />
          </div>

          <div className="px-6 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={draft.tags}
                onChange={(e) => setDraft({ tags: e.target.value })}
                placeholder="标签，用逗号分隔"
                className="px-input"
              />
              <input
                type="text"
                value={draft.coverImage}
                onChange={(e) => setDraft({ coverImage: e.target.value })}
                placeholder="封面图地址，可选"
                className="px-input"
              />
            </div>
          </div>

          <div className="flex-1 px-4 pb-6 pt-2 md:px-6">
            <TiptapEditor
              content={draft.htmlContent}
              placeholder="在这里开始写作，完成后点击「下一步」进入平台适配与发布。"
              onChange={handleEditorChange}
            />
          </div>

          {error && (
            <div className="mx-6 mb-6 rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
              <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]">
                <AlertCircle size={12} /> 校验提示
              </div>
              <p className="mt-2 leading-6">{error}</p>
            </div>
          )}

          <div className="border-t border-[rgba(49,56,45,0.1)] px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-secondary">
                <Save size={13} /> {saving ? '保存中' : '保存'}
              </button>
              <button onClick={handleGoToPlatform} className="px-btn-primary">
                下一步：平台适配 <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'platform' && (
        <div className="mx-auto flex max-w-[1520px] flex-col gap-6">
          <section className="px-card px-paper p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <button onClick={() => setStep('draft')} className="px-btn-ghost -ml-3 w-fit">
                  <ArrowLeft size={14} /> 返回编辑
                </button>
                <div className="flex flex-wrap gap-2">
                  <span className="px-tag"><span className="px-dot bg-green-500" /> 主稿已完成</span>
                  <span className="px-tag border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]"><span className="px-dot bg-[var(--accent)]" /> 平台适配</span>
                </div>
                <div className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                  平台适配 · 发布
                </div>
              </div>
              <ExtensionIndicator />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="px-card px-paper overflow-hidden">
              <div className="border-b border-[rgba(49,56,45,0.1)] px-6 py-5 md:px-8">
                <div className="px-label mb-3">主稿预览</div>
                <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  {draft.title || '未命名稿件'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.tags.split(/[,，]/).map((t, i) => t.trim() && (
                    <span key={i} className="px-tag">{t.trim()}</span>
                  ))}
                </div>
              </div>
              <div className="px-6 py-5 md:px-8">
                <div className="prose prose-sm max-w-none text-[var(--ink-soft)]" dangerouslySetInnerHTML={{ __html: draft.htmlContent }} />
              </div>
            </div>

            <div className="px-card px-soft-panel flex min-h-[780px] flex-col p-5">
              <div className="mb-4">
                <div className="px-label mb-3">发布控制台</div>
                <p className="font-['Cormorant_Garamond'] text-[32px] leading-none tracking-[-0.05em] text-[var(--ink)]">平台输出</p>
              </div>

              <div className="mb-4 rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.78)] p-4">
                <div className="px-label mb-3">目标平台</div>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map((platform) => {
                    const state = platformStates.get(platform);
                    return (
                      <button key={platform} type="button" onClick={() => togglePlatform(platform)}
                        className={`px-tag ${selectedPlatforms.has(platform) ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]' : 'opacity-55'}`}>
                        {state?.platformName || platform}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                {allPlatforms.map((platform) => {
                  const state = platformStates.get(platform);
                  if (!state) return null;
                  return (
                    <PlatformCard key={platform} platform={platform} platformName={state.platformName}
                      selected={selectedPlatforms.has(platform)} onToggle={() => togglePlatform(platform)}
                      status={state.status} statusMessage={state.message}
                      titleCount={state.meta.titleCharCount} titleMax={state.meta.maxTitleLength}
                      bodyCount={state.meta.bodyCharCount} bodyMax={state.meta.maxBodyLength}
                      tagCount={state.meta.tagCount} tagMax={state.meta.maxTags}
                      messages={state.validation.messages}
                      previewBody={state.output.body} previewTags={state.output.tags}
                      draftTitle={draft.title} draftHtmlContent={draft.htmlContent}
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
                  <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]"><AlertCircle size={12} /> 校验提示</div>
                  <p className="mt-2 leading-6">{error}</p>
                </div>
              )}

              <div className="mt-4 border-t border-[rgba(49,56,45,0.12)] pt-4">
                <PublishButton publishing={publishing} selectedCount={Array.from(selectedPlatforms).length}
                  platformStatuses={new Map(Array.from(selectedPlatforms).map((p) => [p, platformStates.get(p)?.status || 'idle']))}
                  onPublish={handlePublish}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
