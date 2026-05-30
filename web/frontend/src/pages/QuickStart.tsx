import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw, Sparkles, Zap, Check, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';
import PlatformCard from '../components/publish/PlatformCard';
import PublishButton from '../components/publish/PublishButton';
import ToastContainer, { showToast } from '../components/publish/Toast';
import { publishToPlatform, checkExtensionHealth } from '../utils/extensionBridge';
import { useExtensionStatus } from '../hooks/useExtensionStatus';
import { generateInspiration, beautifyContentForPlatform } from '../services/deepseek';
import { api } from '../api/client';
import type { PlatformType } from '../adapters/types';
import type { BeautifiedContent } from '../stores/contentStore';

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

type QuickStep = 'inspire' | 'outline' | 'edit' | 'platform';

function ExtensionIndicator() {
  const extStatus = useExtensionStatus();
  if (extStatus.checking) return <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent-deep)]"><span className="px-dot bg-[var(--accent)] px-blink" /> 检查扩展中</span>;
  if (extStatus.available) return <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent-deep)]"><span className="px-dot bg-[var(--accent)]" /> 扩展已连接</span>;
  return <span className="px-tag border-red-300/40 bg-red-100/70 text-red-700"><span className="px-dot bg-red-500" /> 扩展未连接</span>;
}

const stepLabels: Record<QuickStep, string> = {
  inspire: '灵感输入',
  outline: '提纲确认',
  edit: '编辑修改',
  platform: '平台适配',
};

export default function QuickStart() {
  const navigate = useNavigate();
  const {
    draft,
    setDraft,
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

  const [step, setStep] = useState<QuickStep>('inspire');
  const [inspireInput, setInspireInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [outline, setOutline] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedStyle, setSuggestedStyle] = useState('');
  const [beautifyingPlatform, setBeautifyingPlatform] = useState<PlatformType | null>(null);
  const [expandedBeautify, setExpandedBeautify] = useState<Set<PlatformType>>(new Set());
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!inspireInput.trim()) {
      setError('请输入你的灵感描述');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result = await generateInspiration(inspireInput);
      setSuggestedTitle(result.title);
      setOutline(result.outline);
      setSuggestedTags(result.tags);
      setSuggestedStyle(result.style);
      setDraft({
        title: result.title,
        tags: result.tags.join(', '),
        htmlContent: '',
        coverImage: '',
      });
      setStep('outline');
    } catch (err) {
      showToast('error', '灵感生成失败', err instanceof Error ? err.message : '');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmOutline = () => {
    const outlineHtml = outline
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `<p>${line.trim()}</p>`)
      .join('');
    setDraft({ htmlContent: outlineHtml });
    setStep('edit');
  };

  const handleEditorChange = useCallback((html: string, _text: string) => {
    setDraft({ htmlContent: html });
  }, [setDraft]);

  const handleGoToPlatform = () => {
    if (!draft.title.trim()) {
      setError('请输入标题');
      return;
    }
    setError('');
    setStep('platform');
  };

  const handleBeautify = async (platform: PlatformType) => {
    const state = platformStates.get(platform);
    if (!state) return;
    setBeautifyingPlatform(platform);
    try {
      const result = await beautifyContentForPlatform({
        platform,
        platformName: state.platformName,
        title: draft.title || '未命名',
        htmlContent: draft.htmlContent,
        tags: draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      });
      setBeautifiedOutput(platform, result);
      showToast('success', `${state.platformName} 已润色`, '可以应用到当前平台版本');
    } catch (err) {
      showToast('error', `${state.platformName} 润色失败`, err instanceof Error ? err.message : '');
    } finally {
      setBeautifyingPlatform(null);
    }
  };

  const handleApplyBeautified = (platform: PlatformType) => {
    const beautified = beautifiedOutputs.get(platform);
    if (!beautified) return;
    applyBeautifiedContent(platform, beautified.title, beautified.htmlBody, beautified.tags);
    const state = platformStates.get(platform);
    showToast('success', `${state?.platformName || platform} 已应用`, '润色内容已写入平台输出');
  };

  const handlePublish = async () => {
    const selected = allPlatforms.filter((p) => selectedPlatforms.has(p));
    if (selected.length === 0) {
      setError('请至少选择一个平台');
      return;
    }

    const health = await checkExtensionHealth();
    if (!health.connected) {
      showToast('error', '扩展未连接', '请先安装并启用 MultiPublish 扩展');
      return;
    }

    setError('');
    resetPublishStates();

    // save content to backend first
    let contentId = currentContentId;
    if (!contentId) {
      try {
        const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
        const content = await api.createContent({
          title: draft.title || '未命名稿件',
          rawMarkdown: draft.htmlContent,
          tags,
          coverImage: draft.coverImage || undefined,
        });
        setCurrentContentId(content.id);
        contentId = content.id;
        await api.adaptContent(content.id, selected);
      } catch {
        // proceed with local publish even if backend save fails
      }
    }

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

        if (contentId) {
          api.createPublishRecord({
            contentId,
            platform,
            platformName: state.platformName,
            status: result.status,
            message: result.message,
            mockUrl: result.mockUrl,
          }).catch(() => {});
        }

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

        if (contentId) {
          api.createPublishRecord({
            contentId,
            platform,
            platformName: state.platformName,
            status: 'failed',
            message,
          }).catch(() => {});
        }
      }
    }
  };

  const publishing = Array.from(platformStates.values()).some((s) => s.status === 'publishing');
  const steps: QuickStep[] = ['inspire', 'outline', 'edit', 'platform'];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <ToastContainer />
      <div className="mx-auto flex max-w-[1520px] flex-col gap-6">

        <section className="px-card px-paper p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <button onClick={() => navigate('/')} className="px-btn-ghost -ml-3 w-fit">
                <ArrowLeft size={14} />
                返回工作台
              </button>
              <div className="flex flex-wrap gap-2">
                {steps.map((s, i) => (
                  <span key={s} className={`px-tag ${step === s ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]' : steps.indexOf(step) > i ? 'border-green-300/40 bg-green-100/60 text-green-700' : ''}`}>
                    <span className={`px-dot ${step === s ? 'bg-[var(--accent)]' : steps.indexOf(step) > i ? 'bg-green-500' : 'bg-[var(--ink-faint)]'}`} />
                    {i + 1}. {stepLabels[s]}
                  </span>
                ))}
              </div>
              <div className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                快速开始
              </div>
            </div>
            <ExtensionIndicator />
          </div>
        </section>

        {step === 'inspire' && (
          <section className="px-card px-paper p-8 md:p-12">
            <div className="mx-auto max-w-[640px] text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <Zap size={28} className="text-[var(--accent-deep)]" />
              </div>
              <h2 className="font-['Cormorant_Garamond'] text-[38px] leading-[0.95] tracking-[-0.06em] text-[var(--ink)]">
                用一句话描述你的灵感
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-[var(--ink-soft)]">
                AI 将根据你的描述自动生成标题、提纲和标签，然后你可以编辑修改、选择平台润色、一键发布。
              </p>
              <div className="mt-8">
                <textarea
                  value={inspireInput}
                  onChange={(e) => { setInspireInput(e.target.value); setError(''); }}
                  placeholder="例如：如何用 AI 工具提升自媒体创作效率..."
                  rows={3}
                  className="px-input w-full text-center text-[16px]"
                />
              </div>
              {error && (
                <p className="mt-3 text-[13px] text-red-600">{error}</p>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-btn-primary mt-6 min-w-[200px]"
              >
                {generating ? <><RefreshCw size={14} className="animate-spin" /> 生成中...</> : <><Sparkles size={14} /> 生成灵感</>}
              </button>
            </div>
          </section>
        )}

        {step === 'outline' && (
          <section className="px-card px-paper p-8 md:p-10">
            <div className="mx-auto max-w-[720px]">
              <div className="mb-6 flex items-center gap-3">
                <Sparkles size={18} className="text-[var(--accent-deep)]" />
                <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--accent-deep)]">AI 生成结果</span>
              </div>

              <div className="mb-6 rounded-[24px] border border-[var(--accent)]/20 bg-[var(--accent)]/6 p-6">
                <div className="px-label mb-2">建议标题</div>
                <p className="font-['Cormorant_Garamond'] text-[32px] leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
                  {suggestedTitle}
                </p>
              </div>

              <div className="mb-6 rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.78)] p-6">
                <div className="px-label mb-3">内容提纲</div>
                <div className="space-y-3">
                  {outline.split('\n').filter((l) => l.trim()).map((line, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 font-['IBM_Plex_Mono'] text-[9px] text-[var(--accent-deep)]">{i + 1}</div>
                      <p className="text-[14px] leading-7 text-[var(--ink)]">{line.trim()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-3">
                <div>
                  <div className="px-label mb-2">推荐标签</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag, i) => (
                      <span key={i} className="px-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="ml-auto">
                  <div className="px-label mb-2">推荐风格</div>
                  <span className="px-tag border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent-deep)]">{suggestedStyle}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <button onClick={() => setStep('inspire')} className="px-btn-ghost">
                  <ArrowLeft size={14} /> 重新输入
                </button>
                <button onClick={handleConfirmOutline} className="px-btn-primary">
                  确认提纲，进入编辑 <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 'edit' && (
          <section className="px-card px-paper overflow-hidden">
            <div className="border-b border-[rgba(49,56,45,0.1)] px-6 py-5 md:px-8">
              <div>
                <div className="px-label mb-3">编辑修改</div>
                <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  基于提纲完善内容
                </p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ title: e.target.value })}
                  placeholder="标题"
                  className="px-input"
                />
                <input
                  type="text"
                  value={draft.tags}
                  onChange={(e) => setDraft({ tags: e.target.value })}
                  placeholder="标签，逗号分隔"
                  className="px-input"
                />
              </div>
            </div>
            <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6">
              <TiptapEditor
                content={draft.htmlContent}
                placeholder="基于 AI 提纲，展开你的内容..."
                onChange={handleEditorChange}
              />
            </div>
            <div className="border-t border-[rgba(49,56,45,0.1)] px-6 py-4 md:px-8">
              <div className="flex items-center justify-between">
                <button onClick={() => setStep('outline')} className="px-btn-ghost">
                  <ArrowLeft size={14} /> 返回提纲
                </button>
                <button onClick={handleGoToPlatform} className="px-btn-primary">
                  下一步：选择平台 <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 'platform' && (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                <div className="prose prose-sm max-w-none text-[var(--ink-soft)]" dangerouslySetInnerHTML={{ __html: draft.htmlContent }} />
              </div>
              <div className="border-t border-[rgba(49,56,45,0.1)] px-6 py-4 md:px-8">
                <button onClick={() => setStep('edit')} className="px-btn-ghost">
                  <ArrowLeft size={14} /> 返回编辑
                </button>
              </div>
            </div>

            <div className="px-card px-soft-panel flex min-h-[780px] flex-col p-5">
              <div className="mb-4">
                <div className="px-label mb-3">平台适配与发布</div>
                <p className="font-['Cormorant_Garamond'] text-[32px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  选择平台 · 润色 · 发布
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
                        className={`px-tag ${selectedPlatforms.has(platform) ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]' : 'opacity-55'}`}
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
                  const beautified = beautifiedOutputs.get(platform);
                  const isBeautifying = beautifyingPlatform === platform;
                  return (
                    <div key={platform} className={`overflow-hidden rounded-[28px] border transition-all duration-200 ${selectedPlatforms.has(platform) ? 'border-[rgba(49,56,45,0.16)] bg-[rgba(255,255,255,0.82)] shadow-[0_18px_32px_rgba(41,48,39,0.08)]' : 'border-[rgba(49,56,45,0.1)] bg-[rgba(244,249,243,0.72)] opacity-60'}`}>
                      <div className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">{state.platformName}</span>
                            {beautified && (
                              <span className="rounded-full border border-green-300/40 bg-green-100/60 px-2 py-0.5 font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-green-700">
                                <Check size={8} className="inline" /> 已润色
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleBeautify(platform)}
                            disabled={isBeautifying}
                            className="px-btn-ghost h-8 min-h-0 px-3"
                          >
                            {isBeautifying ? <RefreshCw size={11} className="animate-spin" /> : <Wand2 size={11} />}
                            {isBeautifying ? '润色中' : '自动润色'}
                          </button>
                        </div>

                        {beautified && (
                          <div className="mb-3 rounded-[20px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.82)] p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-['Cormorant_Garamond'] text-[24px] leading-none tracking-[-0.04em] text-[var(--ink)]">{beautified.title}</p>
                              <button onClick={() => {
                                const next = new Set(expandedBeautify);
                                next.has(platform) ? next.delete(platform) : next.add(platform);
                                setExpandedBeautify(next);
                              }} className="flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[var(--ink-faint)] hover:border-[rgba(49,56,45,0.14)] hover:bg-[rgba(255,255,255,0.6)]">
                                {expandedBeautify.has(platform) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </div>
                            <pre className={`whitespace-pre-wrap font-['IBM_Plex_Mono'] text-[10px] leading-6 text-[var(--ink-soft)] ${expandedBeautify.has(platform) ? '' : 'line-clamp-4'}`}>{beautified.htmlBody}</pre>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {beautified.tags.map((t, i) => <span key={i} className="px-tag">{t}</span>)}
                            </div>
                            <button onClick={() => handleApplyBeautified(platform)} className="px-btn-primary mt-3 w-full">
                              <Check size={12} /> 应用润色结果
                            </button>
                          </div>
                        )}

                        <div className="text-[12px] leading-6 text-[var(--ink-soft)]">
                          {state.message || '点击「自动润色」适配平台风格，确认后发布'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="mt-4 rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-4 border-t border-[rgba(49,56,45,0.12)] pt-4">
                <PublishButton
                  publishing={publishing}
                  selectedCount={Array.from(selectedPlatforms).length}
                  platformStatuses={new Map(Array.from(selectedPlatforms).map((p) => [p, platformStates.get(p)?.status || 'idle']))}
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
