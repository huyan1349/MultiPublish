import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { useContentStore } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';
import PlatformCard from '../components/publish/PlatformCard';
import PublishButton from '../components/publish/PublishButton';
import ToastContainer, { showToast } from '../components/publish/Toast';
import { publishToPlatform, isExtensionAvailable } from '../utils/extensionBridge';
import { api } from '../api/client';
import type { PlatformType } from '../adapters/types';

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

export default function Editor() {
  const navigate = useNavigate();
  const {
    draft, setDraft, loadDemo,
    selectedPlatforms, platformStates, togglePlatform,
    setPlatformPublishStatus, resetPublishStates,
  } = useContentStore();

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEditorChange = useCallback((html: string, _text: string) => {
    setDraft({ htmlContent: html });
    setError('');
  }, [setDraft]);

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
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const selected = allPlatforms.filter(p => selectedPlatforms.has(p));
    if (selected.length === 0) { setError('请至少选择一个平台'); return; }
    if (!draft.title.trim() || !draft.htmlContent.replace(/<[^>]*>/g, '').trim()) {
      setError('标题和正文不能为空'); return;
    }
    if (!isExtensionAvailable()) {
      showToast('error', '扩展未检测到', '请确保已安装 ContentBridge 扩展');
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
          platform, platformName: state.platformName,
          content: state.output, autoLayout: true,
        });
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
    <div className="h-full flex flex-col">
      <ToastContainer />

      <header className="flex items-center justify-between px-5 py-2.5 border-b border-px-border bg-px-bg shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-tx-mute hover:text-tx transition-colors p-1">
            <ArrowLeft size={14} strokeWidth={1.5} />
          </button>
          <span className="font-mono font-bold text-[10px] text-tx tracking-pixel">EDITOR</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExtensionAvailable() && (
            <span className="flex items-center gap-1 font-mono text-[9px] text-amber-500 bg-amber-500/10 px-2 py-1 border border-amber-500/20">
              <AlertCircle size={10} /> NO EXT
            </span>
          )}
          <button onClick={loadDemo} className="px-btn-ghost text-[9px]">
            <Sparkles size={11} /> DEMO
          </button>
          <button onClick={handleSaveToBackend} disabled={saving} className="px-btn-primary text-[9px]">
            <Save size={11} /> {saving ? 'SAVING…' : 'SAVE'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[5] flex flex-col min-w-0 border-r border-px-border">
          <div className="px-8 pt-6 pb-3 space-y-3">
            <input
              type="text" value={draft.title}
              onChange={e => { setDraft({ title: e.target.value }); setError(''); }}
              placeholder="TITLE"
              className="w-full bg-transparent font-mono font-bold text-lg text-tx placeholder:text-tx-faint outline-none tracking-wide"
            />
            <div className="flex gap-3">
              <input type="text" value={draft.tags} onChange={e => setDraft({ tags: e.target.value })}
                placeholder="TAGS (comma separated)" className="px-input flex-1" />
              <input type="text" value={draft.coverImage} onChange={e => setDraft({ coverImage: e.target.value })}
                placeholder="COVER URL" className="px-input flex-1" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <TiptapEditor content={draft.htmlContent}
              placeholder="Start writing… # heading, **bold**, - list…"
              onChange={handleEditorChange} />
          </div>
        </div>

        <div className="flex-[2] flex flex-col min-w-[280px] max-w-[360px]">
          <div className="px-4 pt-5 pb-2">
            <span className="px-label">TARGET PLATFORMS</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
            {allPlatforms.map(platform => {
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
                />
              );
            })}
          </div>

          {error && (
            <div className="px-4 pb-2 px-fade-in">
              <div className="p-2.5 border border-dot-red/30 bg-dot-red/5 text-dot-red text-[11px] font-mono flex items-center gap-2">
                <AlertCircle size={11} /> {error}
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-px-border">
            <PublishButton
              publishing={publishing}
              selectedCount={Array.from(selectedPlatforms).length}
              platformStatuses={new Map(
                Array.from(selectedPlatforms).map(p => [p, platformStates.get(p)?.status || 'idle'])
              )}
              onPublish={handlePublish}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
