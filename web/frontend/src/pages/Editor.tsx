import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, Save, ArrowLeft, Wand2, RefreshCw } from 'lucide-react';
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
      <span className="flex items-center gap-1.5 font-mono text-[9px] text-amber-600 bg-amber-50 px-2 py-1 border border-amber-200">
        <span className="px-dot bg-amber-400 px-blink" /> CHECKING…
      </span>
    );
  }
  if (extStatus.available) {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[9px] text-emerald-600 bg-emerald-50 px-2 py-1 border border-emerald-200">
        <span className="px-dot bg-emerald-500" /> EXT CONNECTED{extStatus.version ? ` V${extStatus.version}` : ''}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9px] text-dot-red bg-red-50 px-2 py-1 border border-red-200">
      <span className="px-dot bg-dot-red" /> NO EXT
    </span>
  );
}

export default function Editor() {
  const navigate = useNavigate();
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
      showToast('success', '标题已生成', `共 ${titles.length} 个候选`);
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

  const handleBeautifyStart = useCallback((_platform: PlatformType) => {}, []);

  const handleBeautifyComplete = useCallback((platform: PlatformType) => (result: BeautifiedContent) => {
    setBeautifiedOutput(platform, result);
    const state = platformStates.get(platform);
    showToast('success', `${state?.platformName || platform} 美化完成`, '点击展开查看，APPLY 应用到发布内容');
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
    if (!draft.title.trim()) { setError('请输入标题'); return; }
    setSaving(true);
    try {
      const tags = draft.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const content = await api.createContent({ title: draft.title, rawMarkdown: draft.htmlContent, tags, coverImage: draft.coverImage || undefined });
      await api.adaptContent(content.id, Array.from(selectedPlatforms));
      navigate(`/contents/${content.id}/preview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    const selected = allPlatforms.filter(p => selectedPlatforms.has(p));
    if (selected.length === 0) { setError('请至少选择一个平台'); return; }
    if (!draft.title.trim() || !draft.htmlContent.replace(/<[^>]*>/g, '').trim()) {
      setError('标题和正文不能为空'); return;
    }
    const health = await checkExtensionHealth();
    if (!health.connected) {
      showToast('error', '扩展未连接', '请确保已安装 MultiPublish 浏览器扩展并启用。安装后刷新页面重试。');
      return;
    }
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
        const msg = err instanceof Error ? err.message : '未知错误';
        setPlatformPublishStatus(platform, 'failed', msg);
        showToast('error', `${state.platformName} 发布失败`, msg);
      }
    }
  };

  const publishing = Array.from(platformStates.values()).some(s => s.status === 'publishing');

  return (
    <div className="h-full flex flex-col bg-px-bg">
      <ToastContainer />
      <header className="flex items-center justify-between px-6 py-3 border-b border-px-border bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-tx-mute hover:text-tx transition-colors p-1" aria-label="返回首页">
            <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
          <span className="font-mono font-bold text-[10px] text-tx tracking-pixel">EDITOR</span>
        </div>
        <div className="flex items-center gap-2">
          <ExtensionIndicator />
          <button onClick={handleAiTitle} disabled={!!aiLoading} className="px-btn-ghost text-[9px]">
            {aiLoading === 'title' ? <RefreshCw size={11} className="animate-spin" /> : <Wand2 size={11} />} AI TITLE
          </button>
          <button onClick={handleAiTags} disabled={!!aiLoading} className="px-btn-ghost text-[9px]">
            {aiLoading === 'tags' ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />} AI TAGS
          </button>
          <button onClick={loadDemo} className="px-btn-ghost text-[9px]">DEMO</button>
          <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-primary text-[9px]">
            <Save size={11} /> {saving ? 'SAVING…' : 'SAVE'}
          </button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[5] flex flex-col min-w-0 border-r border-px-border bg-white">
          <div className="px-8 pt-6 pb-3 space-y-3">
            <input type="text" name="title" autoComplete="off" aria-label="标题" value={draft.title} onChange={e => { setDraft({ title: e.target.value }); setError(''); }}
              placeholder="TITLE…" className="w-full bg-transparent font-mono font-bold text-lg text-tx placeholder:text-tx-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tx tracking-wide" />
            <div className="flex gap-3">
              <input type="text" name="tags" autoComplete="off" aria-label="标签" value={draft.tags} onChange={e => setDraft({ tags: e.target.value })}
                placeholder="TAGS (comma separated)…" className="px-input flex-1" />
              <input type="url" name="coverImage" autoComplete="url" aria-label="封面图片URL" value={draft.coverImage} onChange={e => setDraft({ coverImage: e.target.value })}
                placeholder="COVER URL…" className="px-input flex-1" spellCheck={false} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-thin">
            <TiptapEditor content={draft.htmlContent} placeholder="Start writing… # heading, **bold**, - list…" onChange={handleEditorChange} />
          </div>
        </div>
        <div className="flex-[2] flex flex-col min-w-[280px] max-w-[360px] bg-px-bg">
          <div className="px-4 pt-5 pb-2"><span className="px-label">TARGET PLATFORMS</span></div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4 scrollbar-thin">
            {allPlatforms.map(platform => {
              const state = platformStates.get(platform);
              if (!state) return null;
              return (
                <PlatformCard key={platform} platform={platform} platformName={state.platformName}
                  selected={selectedPlatforms.has(platform)} onToggle={() => togglePlatform(platform)}
                  status={state.status} statusMessage={state.message}
                  titleCount={state.meta.titleCharCount} titleMax={state.meta.maxTitleLength}
                  bodyCount={state.meta.bodyCharCount} bodyMax={state.meta.maxBodyLength}
                  tagCount={state.meta.tagCount} tagMax={state.meta.maxTags}
                  messages={state.validation.messages} previewBody={state.output.body} previewTags={state.output.tags}
                  draftTitle={draft.title} draftHtmlContent={draft.htmlContent}
                  beautifiedContent={beautifiedOutputs.get(platform)}
                  onBeautifyStart={() => handleBeautifyStart(platform)}
                  onBeautifyComplete={handleBeautifyComplete(platform)}
                  onBeautifyError={handleBeautifyError(platform)}
                  onApplyBeautified={handleApplyBeautified(platform)} />
              );
            })}
          </div>
          {error && (
            <div className="px-4 pb-2 px-fade-in">
              <div className="p-3 border border-dot-red/30 bg-dot-red/5 text-dot-red text-[11px] font-mono flex items-center gap-2">
                <AlertCircle size={11} /> {error}
              </div>
            </div>
          )}
          <div className="px-4 py-3 border-t border-px-border bg-white">
            <PublishButton publishing={publishing} selectedCount={Array.from(selectedPlatforms).length}
              platformStatuses={new Map(Array.from(selectedPlatforms).map(p => [p, platformStates.get(p)?.status || 'idle']))}
              onPublish={handlePublish} />
          </div>
        </div>
      </div>
    </div>
  );
}
