import { useState, useCallback } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useContentStore } from '../stores/contentStore';
import TiptapEditor from '../components/editor/TiptapEditor';
import PlatformCard from '../components/publish/PlatformCard';
import PublishButton from '../components/publish/PublishButton';
import ToastContainer, { showToast } from '../components/publish/Toast';
import { publishToPlatform, isExtensionAvailable } from '../utils/extensionBridge';
import type { PlatformType } from '../adapters/types';

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

export default function Editor() {
  const {
    title, htmlContent, tags, coverImage, selectedPlatforms, platformStates, isPublishing,
    setTitle, setHtmlContent, setTags, setCoverImage, togglePlatform,
    setPlatformPublishStatus, resetPublishStates, loadDemo,
  } = useContentStore();

  const [error, setError] = useState('');

  const handleEditorChange = useCallback((html: string, _text: string) => {
    setHtmlContent(html);
    setError('');
  }, [setHtmlContent]);

  const handlePublish = async () => {
    const selected = allPlatforms.filter((p) => selectedPlatforms.has(p));
    if (selected.length === 0) {
      setError('请至少选择一个平台');
      return;
    }
    if (!title.trim() || !htmlContent.replace(/<[^>]*>/g, '').trim()) {
      setError('标题和正文不能为空');
      return;
    }
    if (!isExtensionAvailable()) {
      showToast('error', '扩展未检测到', '请确保已安装 ContentBridge 扩展并在 Chrome 中打开此页面');
      return;
    }

    setError('');
    resetPublishStates();
    let hasAnySuccess = false;

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
          hasAnySuccess = true;
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

  return (
    <div className="h-full flex flex-col">
      <ToastContainer />

      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/6 bg-surface-light/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 text-sm tracking-wide">ContentBridge</span>
          <span className="w-px h-4 bg-white/10" />
          <span className="text-xs text-slate-500">多平台内容发布</span>
        </div>
        <div className="flex items-center gap-3">
          {!isExtensionAvailable() && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertCircle size={13} />
              未连接扩展
            </span>
          )}
          <button onClick={loadDemo} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Sparkles size={14} /> Demo
          </button>
        </div>
      </header>

      {/* Main Content: Three columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="flex-[5] flex flex-col min-w-0 border-r border-white/5">
          {/* Title + Tags */}
          <div className="px-6 pt-5 pb-3 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(''); }}
              placeholder="输入文章标题…"
              className="w-full bg-transparent text-2xl font-semibold text-white placeholder:text-slate-600 outline-none"
            />
            <div className="flex gap-3">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="标签，逗号分隔…"
                className="input-dark flex-1"
              />
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="封面图 URL（可选）"
                className="input-dark flex-1"
              />
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <TiptapEditor
              content={htmlContent}
              placeholder="输入正文内容…支持 Markdown 快捷输入：输入 # 加空格创建标题、**加粗**、- 列表…"
              onChange={handleEditorChange}
            />
          </div>
        </div>

        {/* Right: Platform Panel */}
        <div className="flex-[2] flex flex-col min-w-[320px] max-w-[400px]">
          <div className="px-4 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-slate-300 mb-1">目标平台</h2>
            <p className="text-xs text-slate-500">选择发布平台，实时预览适配效果</p>
          </div>

          {/* Platform Cards */}
          <div className="flex-1 overflow-y-auto px-4 space-y-2.5 pb-4">
            {allPlatforms.map((platform) => {
              const state = platformStates.get(platform);
              if (!state) return null;
              return (
                <PlatformCard
                  key={platform}
                  state={state}
                  selected={selectedPlatforms.has(platform)}
                  onToggle={() => togglePlatform(platform)}
                />
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 pb-2"
            >
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            </motion.div>
          )}

          {/* Publish Button */}
          <div className="px-4 py-4 border-t border-white/5">
            <PublishButton
              isPublishing={isPublishing}
              selectedCount={allPlatforms.filter((p) => selectedPlatforms.has(p)).length}
              platformStatuses={new Map(
                allPlatforms
                  .filter((p) => selectedPlatforms.has(p))
                  .map((p) => [p, platformStates.get(p)?.status || 'idle'])
              )}
              onPublish={handlePublish}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
