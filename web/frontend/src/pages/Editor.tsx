import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, MessageCircle, RefreshCw, Save, Sparkles, Wand2, Zap, FileText, List } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import type { BeautifiedContent } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';
import AiAssistantPanel from '../components/editor/AiAssistantPanel';
import PlatformCard from '../components/publish/PlatformCard';
import PublishButton from '../components/publish/PublishButton';
import ToastContainer, { showToast } from '../components/publish/Toast';
import { publishViaExtension, isExtensionInstalled } from '../utils/extensionBridge';
import { useExtensionStatus } from '../hooks/useExtensionStatus';
import { generateTitle, suggestTags, generateContentFromOutline, beautifyContentForPlatform } from '../services/deepseek';
import { api } from '../api/client';
import type { PlatformType } from '../adapters/types';

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

const PLATFORM_BRAND: Record<string, { color: string; soft: string; deep: string }> = {
  wechat: { color: 'var(--platform-wechat)', soft: 'var(--platform-wechat-soft)', deep: 'var(--platform-wechat-deep)' },
  zhihu: { color: 'var(--platform-zhihu)', soft: 'var(--platform-zhihu-soft)', deep: 'var(--platform-zhihu-deep)' },
  bilibili: { color: 'var(--platform-bilibili)', soft: 'var(--platform-bilibili-soft)', deep: 'var(--platform-bilibili-deep)' },
  xiaohongshu: { color: 'var(--platform-xiaohongshu)', soft: 'var(--platform-xiaohongshu-soft)', deep: 'var(--platform-xiaohongshu-deep)' },
};

const PLATFORM_NAMES: Record<PlatformType, string> = {
  wechat: '公众号',
  zhihu: '知乎',
  bilibili: 'B站',
  xiaohongshu: '小红书',
};

const CONTENT_FORMATS: Record<PlatformType, Array<{ id: string; label: string; desc: string; icon: typeof Sparkles }>> = {
  wechat: [
    { id: 'deep', label: '深度长文', desc: '小标题分段、逻辑递进、2500-4000字', icon: FileText },
    { id: 'knowledge', label: '干货分享', desc: '结构化技巧、实操步骤、关键词加粗', icon: Zap },
    { id: 'story', label: '情感叙事', desc: '第一人称、故事情节、引发共鸣', icon: Sparkles },
    { id: 'hotspot', label: '热点解读', desc: '快速反应、观点鲜明、多角度分析', icon: Wand2 },
  ],
  zhihu: [
    { id: 'analysis', label: '专业分析', desc: '逻辑严密、数据驱动、引用权威来源', icon: FileText },
    { id: 'experience', label: '经验分享', desc: '真实案例、方法论总结、实操建议', icon: Sparkles },
    { id: 'opinion', label: '观点评论', desc: '立场鲜明、逐层论证、辩证分析', icon: Zap },
    { id: 'explain', label: '科普解读', desc: '通俗化专业、类比举例、由浅入深', icon: Wand2 },
  ],
  bilibili: [
    { id: 'review', label: '测评体验', desc: '真实体验、优缺点对比、口语化', icon: Sparkles },
    { id: 'tutorial', label: '教程攻略', desc: '步骤拆解、短段落、emoji节奏', icon: Zap },
    { id: 'commentary', label: '吐槽观点', desc: '犀利幽默、弹幕感、网络热词', icon: Wand2 },
    { id: 'ranking', label: '盘点合集', desc: '排名列表、逐项点评、轻松风格', icon: List },
  ],
  xiaohongshu: [
    { id: 'review', label: '种草测评', desc: 'emoji丰富、使用体验、购买建议', icon: Sparkles },
    { id: 'tutorial', label: '教程攻略', desc: '步骤编号、简洁说明、亲切邻家', icon: Zap },
    { id: 'collection', label: '好物合集', desc: '清单推荐、每项种草、互动引导', icon: List },
    { id: 'explore', label: '探店体验', desc: '氛围感描述、沉浸式、清单体', icon: Wand2 },
  ],
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

type EditorStep = 'outline' | 'content' | 'platform';

export default function Editor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  const fromInspiration = searchParams.get('from') === 'inspiration';
  const paramTopic = searchParams.get('topic') || '';
  const paramPoints = searchParams.get('points') || '';
  const [step, setStep] = useState<EditorStep>(fromInspiration ? 'content' : 'outline');
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
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const [isAiModified, setIsAiModified] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Outline state
  const [outline, setOutline] = useState({ topic: paramTopic, points: paramPoints, style: '' });

  // Pre-fill outline from inspiration
  useEffect(() => {
    if (fromInspiration && paramTopic) {
      setOutline({ topic: paramTopic, points: paramPoints, style: '' });
    }
  }, []);

  // Content generation state
  const [activePlatform, setActivePlatform] = useState<PlatformType>('wechat');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedContents, setGeneratedContents] = useState<Record<string, { title: string; htmlBody: string; tags: string[] }>>({});

  // Beautify-all state
  const [beautifyingPlatforms, setBeautifyingPlatforms] = useState<Set<PlatformType>>(new Set());

  const getSelectedText = useCallback((): string => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return '';
    return sel.toString();
  }, []);

  const handleApplyOptimization = useCallback((title: string, htmlBody: string) => {
    setDraft({ title, htmlContent: htmlBody });
    setEditorKey((k) => k + 1);
    setIsAiModified(true);
    showToast('success', 'AI 优化已应用', '标题和正文已更新到编辑器');
  }, [setDraft]);

  const handleApplySelectionOptimization = useCallback((originalText: string, optimizedText: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    try {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const span = document.createElement('span');
      span.innerHTML = optimizedText;
      const frag = document.createDocumentFragment();
      let child: Node | null;
      while ((child = span.firstChild)) frag.appendChild(child);
      range.insertNode(frag);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      const editorEl = document.querySelector('.tiptap.ProseMirror') as HTMLElement;
      if (editorEl) setDraft({ htmlContent: editorEl.innerHTML });
      showToast('success', '选中文字已替换', 'AI 优化后的文字已写入编辑器');
    } catch {
      showToast('error', '替换失败', '请确保编辑器中的文字仍被选中');
    }
  }, [setDraft]);

  const handleEditorChange = useCallback((html: string, _text: string) => {
    setDraft({ htmlContent: html });
    setError('');
    setIsAiModified(false);
  }, [setDraft]);

  const handleAiTitle = async () => {
    setAiLoading('title');
    try {
      const titles = await generateTitle(draft.htmlContent);
      if (titles.length > 0) setDraft({ title: titles[0] });
      showToast('success', '标题已生成', `生成了 ${titles.length} 个候选标题`);
    } catch (err) {
      showToast('error', '标题生成失败', err instanceof Error ? err.message : '');
    } finally { setAiLoading(null); }
  };

  const handleAiTags = async () => {
    setAiLoading('tags');
    try {
      const tags = await suggestTags(draft.title, draft.htmlContent);
      if (tags.length > 0) setDraft({ tags: tags.join(', ') });
      showToast('success', '标签已生成', tags.join('、'));
    } catch (err) {
      showToast('error', '标签生成失败', err instanceof Error ? err.message : '');
    } finally { setAiLoading(null); }
  };

  const handleBeautifyAll = async () => {
    const targets = allPlatforms.filter((p) => selectedPlatforms.has(p));
    if (targets.length === 0 || beautifyingPlatforms.size > 0) return;
    showToast('info', '开始一键优化', `正在为 ${targets.length} 个平台美化内容…`);
    for (const p of targets) {
      setBeautifyingPlatforms((prev) => new Set(prev).add(p));
    }
    const results: Array<{ platform: PlatformType; result: BeautifiedContent }> = [];
    for (const platform of targets) {
      const state = platformStates.get(platform);
      if (!state) continue;
      try {
        const res = await beautifyContentForPlatform({
            platform,
            platformName: PLATFORM_NAMES[platform],
            title: draft.title || '未命名',
            htmlContent: draft.htmlContent || state.output.body,
            tags: state.output.tags.length > 0 ? state.output.tags : ['内容创作'],
          });
        setBeautifiedOutput(platform, res);
        results.push({ platform, result: res });
      } catch (err) {
        showToast('error', `${PLATFORM_NAMES[platform]} 美化失败`, err instanceof Error ? err.message : '');
      } finally {
        setBeautifyingPlatforms((prev) => {
          const next = new Set(prev);
          next.delete(platform);
          return next;
        });
      }
    }
    if (results.length > 0) {
      showToast('success', `已优化 ${results.length}/${targets.length} 个平台`, '点击平台标签切换查看，或直接应用到对应平台');
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

  // Go outline → content
  const handleGoToContent = () => {
    if (!outline.topic.trim()) {
      setError('请输入话题');
      return;
    }
    if (!outline.points.trim()) {
      setError('请输入大纲要点');
      return;
    }
    setError('');
    // Also sync outline to draft as initial content
    const outlineHtml = `<h2>${outline.topic}</h2>${outline.points.split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('')}`;
    setDraft({ title: outline.topic, htmlContent: outlineHtml });
    setStep('content');
  };

  // Generate content from outline for selected platform + format
  const handleGenerateContent = async () => {
    if (!selectedFormat || generating) return;
    setGenerating(true);
    try {
      const result = await generateContentFromOutline({
        platform: activePlatform,
        platformName: PLATFORM_NAMES[activePlatform],
        formatId: selectedFormat,
        formatName: CONTENT_FORMATS[activePlatform].find((f) => f.id === selectedFormat)?.label || selectedFormat,
        outline,
      });
      setGeneratedContents((prev) => ({ ...prev, [activePlatform]: result }));
      // Also update draft with generated content
      setDraft({ title: result.title, htmlContent: result.htmlBody, tags: result.tags.join(', ') });
      setEditorKey((k) => k + 1);
      showToast('success', `${PLATFORM_NAMES[activePlatform]} 内容已生成`, `格式：${CONTENT_FORMATS[activePlatform].find((f) => f.id === selectedFormat)?.label}`);
    } catch (err) {
      showToast('error', '生成失败', err instanceof Error ? err.message : '请重试');
    } finally { setGenerating(false); }
  };

  // Go content → platform
  const handleGoToPlatform = () => {
    if (!draft.title.trim()) {
      setError('请先生成或输入内容');
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
    if (!draft.title.trim()) { setError('请输入标题'); return; }
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
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    const selected = allPlatforms.filter((platform) => selectedPlatforms.has(platform));
    if (selected.length === 0) { setError('请至少选择一个平台'); return; }
    if (!draft.title.trim() || !draft.htmlContent.replace(/<[^>]*>/g, '').trim()) {
      setError('标题和正文不能为空'); return;
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
        const result = await publishViaExtension({ platform, content: state.output, autoLayout: true });
        if (currentContentId) {
          api.createPublishRecord({
            contentId: currentContentId, platform, platformName: state.platformName,
            status: result.success ? 'success' : 'failed', message: result.message,
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
            contentId: currentContentId, platform, platformName: state.platformName,
            status: 'failed', message,
          }).catch(() => {});
        }
      }
    }
  };

  const publishing = Array.from(platformStates.values()).some((state) => state.status === 'publishing');
  const generatedContent = generatedContents[activePlatform];

  return (
    <div className="">
      <ToastContainer />
      <div className="mx-auto flex max-w-[1520px] flex-col gap-6">

        {/* Header */}
        <section className="px-card px-paper p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (step === 'platform') setStep('content');
                  else if (step === 'content') setStep('outline');
                  else navigate('/');
                }}
                className="px-btn-ghost -ml-3 w-fit"
              >
                <ArrowLeft size={14} />
                {step === 'platform' ? '返回内容' : step === 'content' ? '返回大纲' : '返回工作台'}
              </button>
              <div className="flex flex-wrap gap-2">
                {(['outline', 'content', 'platform'] as const).map((s) => (
                  <span key={s} className={`px-tag ${step === s ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent-deep)]' : ''}`}>
                    <span className={`px-dot ${step === s ? 'bg-[var(--accent)]' : 'bg-[var(--ink-faint)]'}`} />
                    {s === 'outline' ? '第一步：大纲' : s === 'content' ? '第二步：内容生成' : '第三步：平台输出'}
                  </span>
                ))}
              </div>
              <div className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                {step === 'outline' ? '编辑台 · 大纲' : step === 'content' ? '编辑台 · 内容生成' : '编辑台 · 平台输出'}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 xl:justify-end">
              <ExtensionIndicator />
              {step === 'outline' && (
                <>
                  {!isEditing && <button onClick={loadDemo} className="px-btn-secondary">载入示例</button>}
                  <button
                    onClick={() => setAiPanelOpen(!aiPanelOpen)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
                      aiPanelOpen
                        ? 'bg-[var(--accent)]/10 text-[var(--accent-deep)] border border-[var(--accent)]/30'
                        : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] shadow-[0_4px_12px_rgba(91,108,240,0.25)]'
                    }`}
                  >
                    <MessageCircle size={13} />
                    writer
                  </button>
                  <button onClick={handleGoToContent} className="px-btn-primary">
                    下一步：生成内容 <ArrowRight size={13} />
                  </button>
                </>
              )}
              {(step === 'content' || step === 'platform') && (
                <>
                  <button
                    onClick={() => setAiPanelOpen(!aiPanelOpen)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
                      aiPanelOpen
                        ? 'bg-[var(--accent)]/10 text-[var(--accent-deep)] border border-[var(--accent)]/30'
                        : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] shadow-[0_4px_12px_rgba(91,108,240,0.25)]'
                    }`}
                  >
                    <MessageCircle size={13} />
                    writer
                  </button>
                  {step === 'content' && (
                    <button onClick={handleGoToPlatform} className="px-btn-primary">
                      下一步：平台输出 <ArrowRight size={13} />
                    </button>
                  )}
                  {step === 'platform' && (
                    <>
                      <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-secondary">
                        <Save size={13} />
                        {saving ? '保存中' : isEditing ? '保存修改' : '保存预览'}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Step 1: Outline */}
        {step === 'outline' && (
          <div className="flex gap-0" ref={editorRef}>
            <section className="px-card px-paper overflow-hidden flex-1 min-w-0">
              <div className="border-b border-[rgba(49,56,45,0.1)] px-6 py-5 md:px-8">
                <div>
                  <div className="px-label mb-2">大纲编辑</div>
                  <p className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                    先搭骨架，再长血肉
                  </p>
                  <p className="mt-3 text-[13px] text-[var(--ink-soft)] leading-6">
                    写出核心话题和关键要点。可以自己动手写，也可以让 writer 帮你头脑风暴。下一步 AI 会根据大纲，为每个平台生成符合热门风格的完整内容。
                  </p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">核心话题</label>
                    <input
                      type="text"
                      value={outline.topic}
                      onChange={(e) => { setOutline((o) => ({ ...o, topic: e.target.value })); setError(''); }}
                      placeholder="比如：AI 工具如何提升工作效率"
                      className="px-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">风格偏好（可选）</label>
                    <input
                      type="text"
                      value={outline.style}
                      onChange={(e) => setOutline((o) => ({ ...o, style: e.target.value }))}
                      placeholder="比如：口语化、幽默、专业严谨"
                      className="px-input w-full"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <label className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">关键要点 · 每行一个</label>
                  <textarea
                    value={outline.points}
                    onChange={(e) => { setOutline((o) => ({ ...o, points: e.target.value })); setError(''); }}
                    placeholder={`1. AI 工具的分类与选择标准
2. 五种高频场景的实操案例
3. 避坑指南：三个常见误区
4. 未来趋势与个人建议`}
                    rows={10}
                    className="px-input w-full resize-y font-mono text-[13px] leading-7"
                  />
                </div>
              </div>

              {error && (
                <div className="mx-6 mb-6 rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
                  <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]">
                    <AlertCircle size={12} />校验提示
                  </div>
                  <p className="mt-2 leading-6">{error}</p>
                </div>
              )}
            </section>

            <AiAssistantPanel
              open={aiPanelOpen}
              onClose={() => setAiPanelOpen(false)}
              articleTitle={outline.topic}
              articleContent={outline.points}
              getSelectedText={getSelectedText}
              onApplyOptimization={handleApplyOptimization}
              onApplySelectionOptimization={handleApplySelectionOptimization}
            />
          </div>
        )}

        {/* Step 2: Content Generation */}
        {step === 'content' && (
          <div className="flex gap-0" ref={editorRef}>
            <section className="px-card px-paper overflow-hidden flex-1 min-w-0">
              {/* Platform tabs */}
              <div className="border-b border-[rgba(49,56,45,0.1)] px-6 py-3 md:px-8">
                <div className="flex items-center gap-0.5">
                  {allPlatforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setActivePlatform(p); setSelectedFormat(null); }}
                      className={`px-4 py-2.5 rounded-[12px] text-[12px] font-medium transition-all duration-200 ${
                        activePlatform === p
                          ? 'text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)]'
                          : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[rgba(0,0,0,0.03)]'
                      }`}
                      style={activePlatform === p ? { backgroundColor: PLATFORM_BRAND[p]?.color } : undefined}
                    >
                      {PLATFORM_NAMES[p]}
                      {generatedContents[p] && (
                        <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-white/70" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format selection */}
              <div className="border-b border-[rgba(49,56,45,0.06)] px-6 py-4 md:px-8 bg-[rgba(249,250,248,0.6)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                    {PLATFORM_NAMES[activePlatform]} 热门格式
                  </span>
                  <span className="text-[11px] text-[var(--ink-soft)]">← 选一个最合适的</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_FORMATS[activePlatform].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt.id === selectedFormat ? null : fmt.id)}
                      disabled={generating}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[12px] text-left transition-all duration-200 ${
                        selectedFormat === fmt.id
                          ? 'text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                          : 'border border-[rgba(49,56,45,0.1)] bg-white hover:border-[rgba(49,56,45,0.2)] hover:-translate-y-0.5'
                      }`}
                      style={selectedFormat === fmt.id ? { backgroundColor: PLATFORM_BRAND[activePlatform]?.color } : undefined}
                    >
                      <fmt.icon size={13} />
                      <div>
                        <div className="font-medium">{fmt.label}</div>
                        <div className={`text-[10px] ${selectedFormat === fmt.id ? 'text-white/70' : 'text-[var(--ink-faint)]'}`}>{fmt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate + Edit area */}
              <div className="px-6 py-4 md:px-8">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={handleGenerateContent}
                    disabled={!selectedFormat || generating}
                    className="flex items-center gap-2 px-6 py-3 rounded-[14px] text-white text-[13px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    style={{
                      background: selectedFormat
                        ? `linear-gradient(135deg, ${PLATFORM_BRAND[activePlatform]?.color}, ${PLATFORM_BRAND[activePlatform]?.color}dd)`
                        : 'var(--ink-faint)',
                      boxShadow: selectedFormat ? `0 8px 24px ${PLATFORM_BRAND[activePlatform]?.color}30` : 'none',
                    }}
                  >
                    {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {generating ? 'AI 正在生成…' : selectedFormat
                      ? `AI 生成 ${PLATFORM_NAMES[activePlatform]} ${CONTENT_FORMATS[activePlatform].find((f) => f.id === selectedFormat)?.label}`
                      : '先选择一种格式'}
                  </button>
                  <button onClick={handleAiTitle} disabled={!!aiLoading} className="px-btn-ghost text-[11px]">
                    <Wand2 size={12} /> 标题建议
                  </button>
                  <button onClick={handleAiTags} disabled={!!aiLoading} className="px-btn-ghost text-[11px]">
                    <Sparkles size={12} /> 标签建议
                  </button>
                </div>

                {/* Title + Tags inputs */}
                <div className="grid gap-3 md:grid-cols-3 mb-4">
                  <input
                    type="text" value={draft.title}
                    onChange={(e) => { setDraft({ title: e.target.value }); setError(''); }}
                    placeholder="标题" className="px-input"
                  />
                  <input
                    type="text" value={draft.tags}
                    onChange={(e) => setDraft({ tags: e.target.value })}
                    placeholder="标签，逗号分隔" className="px-input"
                  />
                  <input
                    type="text" value={draft.coverImage}
                    onChange={(e) => setDraft({ coverImage: e.target.value })}
                    placeholder="封面图地址（可选）" className="px-input"
                  />
                </div>

                {/* Editor */}
                <div className={`px-4 pb-4 pt-2 md:px-6 md:pb-6 ${isAiModified ? 'ai-modified-editor' : ''}`}>
                  {isAiModified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200/60 text-amber-700 font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] mb-2">
                      <Sparkles size={10} /> AI 修改
                    </span>
                  )}
                  <TiptapEditor
                    key={editorKey}
                    content={draft.htmlContent}
                    placeholder="AI 生成的内容将显示在这里，你可以直接编辑修改..."
                    onChange={handleEditorChange}
                  />
                </div>
              </div>

              {error && (
                <div className="mx-6 mb-6 rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
                  <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]">
                    <AlertCircle size={12} />校验提示
                  </div>
                  <p className="mt-2 leading-6">{error}</p>
                </div>
              )}
            </section>

            <AiAssistantPanel
              open={aiPanelOpen}
              onClose={() => setAiPanelOpen(false)}
              articleTitle={draft.title}
              articleContent={draft.htmlContent}
              getSelectedText={getSelectedText}
              onApplyOptimization={handleApplyOptimization}
              onApplySelectionOptimization={handleApplySelectionOptimization}
            />
          </div>
        )}

        {/* Step 3: Platform Output */}
        {step === 'platform' && (
          <div className="flex flex-col gap-6">
            {/* Platform selection + actions bar */}
            <section className="px-card px-paper p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="px-label mb-2">目标平台</div>
                  <div className="flex flex-wrap gap-2">
                    {allPlatforms.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        className={`px-tag text-[13px] px-3.5 py-2 rounded-[12px] transition-all ${selectedPlatforms.has(platform) ? '' : 'opacity-45'}`}
                        style={selectedPlatforms.has(platform) ? { borderColor: PLATFORM_BRAND[platform]?.soft, backgroundColor: PLATFORM_BRAND[platform]?.soft, color: PLATFORM_BRAND[platform]?.deep } : undefined}
                      >
                        {PLATFORM_NAMES[platform]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBeautifyAll}
                    disabled={beautifyingPlatforms.size > 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-white text-[13px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      boxShadow: '0 6px 20px rgba(139,92,246,0.3)',
                    }}
                  >
                    {beautifyingPlatforms.size > 0 ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {beautifyingPlatforms.size > 0 ? `优化中 ${beautifyingPlatforms.size}…` : '一键优化全部'}
                  </button>
                  <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-secondary">
                    <Save size={13} />
                    {saving ? '保存中' : isEditing ? '保存修改' : '保存预览'}
                  </button>
                  <PublishButton
                    publishing={publishing}
                    selectedCount={Array.from(selectedPlatforms).length}
                    platformStatuses={new Map(Array.from(selectedPlatforms).map((platform) => [platform, platformStates.get(platform)?.status || 'idle']))}
                    onPublish={handlePublish}
                  />
                </div>
              </div>
            </section>

            {/* Platform tab bar + cards */}
            <section className="px-card px-paper overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-[rgba(49,56,45,0.08)]">
                {allPlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[12px] font-medium transition-all duration-200 relative ${
                      activePlatform === p
                        ? 'text-[var(--ink)]'
                        : 'text-[var(--ink-faint)] hover:text-[var(--ink-soft)]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PLATFORM_BRAND[p]?.color }}
                    />
                    {PLATFORM_NAMES[p]}
                    {selectedPlatforms.has(p) && (
                      <span className="text-[9px] opacity-60">已选</span>
                    )}
                    {beautifiedOutputs.has(p) && (
                      <Sparkles size={10} style={{ color: PLATFORM_BRAND[p]?.color }} />
                    )}
                    {beautifyingPlatforms.has(p) && (
                      <RefreshCw size={10} className="animate-spin" style={{ color: PLATFORM_BRAND[p]?.color }} />
                    )}
                    {activePlatform === p && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ backgroundColor: PLATFORM_BRAND[p]?.color }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Active platform card */}
              <div className="p-4 md:p-5">
                {allPlatforms.map((platform) => {
                  const state = platformStates.get(platform);
                  if (!state) return null;
                  return (
                    <div key={platform} className={activePlatform === platform ? '' : 'hidden'}>
                      <PlatformCard
                        platform={platform}
                        platformName={PLATFORM_NAMES[platform]}
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
                    </div>
                  );
                })}
              </div>
            </section>

            {error && (
              <div className="rounded-[22px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">
                <div className="flex items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em]">
                  <AlertCircle size={12} />校验提示
                </div>
                <p className="mt-2 leading-6">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
