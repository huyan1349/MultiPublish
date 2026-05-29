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
      showToast('error', '扩展未检测到', '请确保已安装 ContentBridge 扩展并在 Chrome 中打开此页面');
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

      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-white/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-ink-muted hover:text-ink transition-colors p-1">
            <ArrowLeft size={17} strokeWidth={1.5} />
          </button>
          <span className="font-display font-600 text-ink text-sm">编辑器</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExtensionAvailable() && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
              <AlertCircle size={12} /> 未连接扩展
            </span>
          )}
          <button onClick={loadDemo} className="btn-ghost text-xs">
            <Sparkles size={13} /> Demo
          </button>
          <button onClick={handleSaveToBackend} disabled={saving} className="btn-primary text-xs">
            <Save size={13} /> {saving ? '保存中…' : '保存并预览'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[5] flex flex-col min-w-0 border-r border-border">
          <div className="px-8 pt-6 pb-3 space-y-3">
            <input
              type="text" value={draft.title}
              onChange={e => { setDraft({ title: e.target.value }); setError(''); }}
              placeholder="输入文章标题…"
              className="w-full bg-transparent text-[22px] font-display font-700 text-ink placeholder:text-ink-faint outline-none tracking-tight"
            />
            <div className="flex gap-3">
              <input type="text" value={draft.tags} onChange={e => setDraft({ tags: e.target.value })}
                placeholder="标签，逗号分隔…" className="input flex-1" />
              <input type="text" value={draft.coverImage} onChange={e => setDraft({ coverImage: e.target.value })}
                placeholder="封面图 URL（可选）" className="input flex-1" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <TiptapEditor content={draft.htmlContent}
              placeholder="输入正文内容…支持 Markdown 快捷输入：输入 # 加空格创建标题、**加粗**、- 列表…"
              onChange={handleEditorChange} />
          </div>
        </div>

        <div className="flex-[2] flex flex-col min-w-[300px] max-w-[380px]">
          <div className="px-5 pt-6 pb-3">
            <h2 className="font-display font-600 text-ink text-sm mb-0.5">目标平台</h2>
            <p className="text-[11px] text-ink-muted">选择发布平台，实时预览适配效果</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-4">
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
            <div className="px-5 pb-2 animate-fade-in">
              <div className="p-3 rounded-lg bg-red-50 border border-red-200/60 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle size={13} /> {error}
              </div>
            </div>
          )}

          <div className="px-5 py-4 border-t border-border">
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
