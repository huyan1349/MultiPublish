import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCw, Save, Sparkles, Wand2 } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import type { BeautifiedContent } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';
import PlatformCard from '../components/publish/PlatformCard';
import PublishButton from '../components/publish/PublishButton';
import ToastContainer, { showToast } from '../components/publish/Toast';
import { publishViaExtension, isExtensionInstalled } from '../utils/extensionBridge';
import { useExtensionStatus } from '../hooks/useExtensionStatus';
import { generateTitle, suggestTags } from '../services/deepseek';
import { api } from '../api/client';
import type { PlatformType } from '../adapters/types';

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

const PLATFORM_BRAND: Record<string, { color: string; soft: string; deep: string }> = {
  wechat: { color: 'var(--platform-wechat)', soft: 'var(--platform-wechat-soft)', deep: 'var(--platform-wechat-deep)' },
  zhihu: { color: 'var(--platform-zhihu)', soft: 'var(--platform-zhihu-soft)', deep: 'var(--platform-zhihu-deep)' },
  bilibili: { color: 'var(--platform-bilibili)', soft: 'var(--platform-bilibili-soft)', deep: 'var(--platform-bilibili-deep)' },
  xiaohongshu: { color: 'var(--platform-xiaohongshu)', soft: 'var(--platform-xiaohongshu-soft)', deep: 'var(--platform-xiaohongshu-deep)' },
};

function ExtensionIndicator() {
  const extStatus = useExtensionStatus();

  if (extStatus.checking) {
    return (
      <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent-deep)]">
        <span className="px-dot bg-[var(--accent)] px-blink" /> 检查扩展中
      </span>
    );
  }

  if (extStatus.available) {
    return (
      <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent-deep)]">
        <span className="px-dot bg-[var(--accent)]" /> 扩展已连接{extStatus.version ? ` v${extStatus.version}` : ''}
      </span>
    );
  }

  return (
    <span className="px-tag border-red-300/40 bg-red-100/70 text-red-700">
      <span className="px-dot bg-red-500" /> 扩展未连接
    </span>
  );
}

type EditorStep = 'draft' | 'platform';

export default function Editor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  const [step, setStep] = useState<EditorStep>('draft');
  const {
    draft,
    setDraft,
    loadDemo,
    currentContentId,
    setCurrentContentId,
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
    if (!draft.title.trim()) {
      setError('请输入标题');
      return;
    }
    if (!draft.htmlContent.replace(/<[^>]*>/g, '').trim()) {
      setError('正文不能为空');
      return;
    }
    setError('');
    setStep('platform');
  };

  const handleSaveToBackend = async () => {
    if (!draft.title.trim()) {
      setError('请输入标题');
      return;
    }

    setSaving(true);
    try {
      const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      if (isEditing && currentContentId) {
        await api.updateContent(currentContentId, {
          title: draft.title,
          rawMarkdown: draft.htmlContent,
          tags,
          coverImage: draft.coverImage || undefined,
        });
        await api.adaptContent(currentContentId, Array.from(selectedPlatforms));
        navigate(`/contents/${currentContentId}/preview`);
      } else {
        const content = await api.createContent({
          title: draft.title,
          rawMarkdown: draft.htmlContent,
          tags,
          coverImage: draft.coverImage || undefined,
        });
        setCurrentContentId(content.id);
        await api.adaptContent(content.id, Array.from(selectedPlatforms));
        navigate(`/contents/${content.id}/preview`);
      }
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

    const health = isExtensionInstalled();
    if (!health) {
      showToast('error', '扩展未连接', '请先安装并启用 MultiPublish 扩展，然后再执行真实发布。');
      return;
    }

    setError('');
    resetPublishStates();

    for (const platform of selected) {
      const state = platformStates.get(platform);
      if (!state) continue;

      setPlatformPublishStatus(platform, 'publishing');
      try {
        const result = await publishViaExtension({
          platform,
          content: state.output,
          autoLayout: true,
        });

        if (currentContentId) {
          api.createPublishRecord({
            contentId: currentContentId,
            platform,
            platformName: state.platformName,
            status: result.success ? 'success' : 'failed',
            message: result.message,
          }).catch(() => {});
        }

        if (result.success) {
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

        if (currentContentId) {
          api.createPublishRecord({
            contentId: currentContentId,
            platform,
            platformName: state.platformName,
            status: 'failed',
            message,
          }).catch(() => {});
        }
      }
    }
  };

  const publishing = Array.from(platformStates.values()).some((state) => state.status === 'publishing');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <ToastContainer />
      <div className="mx-auto flex max-w-[1520px] flex-col gap-6">

        <section className="px-card px-paper p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <button onClick={() => step === 'platform' ? setStep('draft') : navigate('/')} className="px-btn-ghost -ml-3 w-fit">
                <ArrowLeft size={14} />
                {step === 'platform' ? '返回主稿' : '返回工作台'}
              </button>
              <div className="flex flex-wrap gap-2">
                <span className={`px-tag ${step === 'draft' ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]' : ''}`}>
                  <span className={`px-dot ${step === 'draft' ? 'bg-[var(--accent)]' : 'bg-[var(--ink-faint)]'}`} /> 第一步：主稿
                </span>
                <span className={`px-tag ${step === 'platform' ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]' : ''}`}>
                  <span className={`px-dot ${step === 'platform' ? 'bg-[var(--accent)]' : 'bg-[var(--ink-faint)]'}`} /> 第二步：平台适配
                </span>
              </div>
              <div className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                {step === 'draft' ? (isEditing ? '编辑台 · 修改稿件' : '编辑台 · 主稿') : '编辑台 · 平台输出'}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 xl:justify-end">
              <ExtensionIndicator />
              {step === 'draft' && (
                <>
                  {!isEditing && <button onClick={loadDemo} className="px-btn-secondary">载入示例</button>}
                  <button onClick={handleAiTitle} disabled={!!aiLoading} className="px-btn-ghost">
                    {aiLoading === 'title' ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    标题建议
                  </button>
                  <button onClick={handleAiTags} disabled={!!aiLoading} className="px-btn-ghost">
                    {aiLoading === 'tags' ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    标签建议
                  </button>
                  <button onClick={handleGoToPlatform} className="px-btn-primary">
                    下一步 <ArrowRight size={13} />
                  </button>
                </>
              )}
              {step === 'platform' && (
                <>
                  <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-secondary">
                    <Save size={13} />
                    {saving ? '保存中' : isEditing ? '保存修改' : '保存预览'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {step === 'draft' && (
          <section className="px-card px-paper overflow-hidden">
            <div className="border-b border-[rgba(49,56,45,0.1)] px-6 py-5 md:px-8">
              <div>
                <div className="px-label mb-3">正文编辑区</div>
                <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  当前主稿
                </p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => {
                    setDraft({ title: event.target.value });
                    setError('');
                  }}
                  placeholder="输入标题"
                  className="px-input"
                />
                <input
                  type="text"
                  value={draft.tags}
                  onChange={(event) => setDraft({ tags: event.target.value })}
                  placeholder="输入标签，用逗号分隔"
                  className="px-input"
                />
                <input
                  type="text"
                  value={draft.coverImage}
                  onChange={(event) => setDraft({ coverImage: event.target.value })}
                  placeholder="封面图地址，可选"
                  className="px-input"
                />
              </div>
            </div>
            <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6">
              <TiptapEditor
                content={draft.htmlContent}
                placeholder="在这里开始写作，完成后点击「下一步」进入平台适配阶段。"
                onChange={handleEditorChange}
              />
            </div>

            {error && (
              <div className="mx-6 mb-6 rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
                <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]">
                  <AlertCircle size={12} />
                  校验提示
                </div>
                <p className="mt-2 leading-6">{error}</p>
              </div>
            )}
          </section>
        )}

        {step === 'platform' && (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="px-card px-paper overflow-hidden">
              <div className="border-b border-[rgba(49,56,45,0.1)] px-6 py-5 md:px-8">
                <div>
                  <div className="px-label mb-3">主稿预览</div>
                  <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                    {draft.title || '未命名稿件'}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.tags.split(/[,，]/).map((t, i) => t.trim() && (
                    <span key={i} className="px-tag">{t.trim()}</span>
                  ))}
                </div>
              </div>
              <div className="px-6 py-5 md:px-8">
                <div
                  className="prose prose-sm max-w-none text-[var(--ink-soft)]"
                  dangerouslySetInnerHTML={{ __html: draft.htmlContent }}
                />
              </div>
            </div>

            <div className="px-card px-soft-panel flex min-h-[780px] flex-col p-5">
              <div className="mb-4">
                <div className="px-label mb-3">发布控制台</div>
                <p className="font-['Cormorant_Garamond'] text-[32px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  平台输出
                </p>
              </div>

              <div className="mb-4 rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.78)] p-4">
                <div className="px-label mb-3">目标平台</div>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map((platform) => {
                    const state = platformStates.get(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        className={`px-tag ${selectedPlatforms.has(platform) ? '' : 'opacity-55'}`}
                        style={selectedPlatforms.has(platform) ? { borderColor: PLATFORM_BRAND[platform]?.soft, backgroundColor: PLATFORM_BRAND[platform]?.soft, color: PLATFORM_BRAND[platform]?.deep } : undefined}
                      >
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
                    校验提示
                  </div>
                  <p className="mt-2 leading-6">{error}</p>
                </div>
              )}

              <div className="mt-4 border-t border-[rgba(49,56,45,0.12)] pt-4">
                <PublishButton
                  publishing={publishing}
                  selectedCount={Array.from(selectedPlatforms).length}
                  platformStatuses={new Map(Array.from(selectedPlatforms).map((platform) => [platform, platformStates.get(platform)?.status || 'idle']))}
                  onPublish={handlePublish}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
