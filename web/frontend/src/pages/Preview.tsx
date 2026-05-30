import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, CheckCircle, AlertTriangle, Info, Loader2, Zap, Eye, Edit3, ExternalLink, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { publishViaExtension, isExtensionInstalled, type ExtensionPublishResult } from '../utils/extensionBridge'
import { buildImagePayloads } from '../utils/imageUtils';;

interface Output {
  id: string; platform: string; platformName: string;
  title: string; summary?: string; body: string; tags: string[];
  coverImage?: string; extra?: Record<string, unknown>;
  validationMessages: Array<{ level: string; field: string; message: string }>;
  status: string;
}

interface PublishResult {
  platformName: string;
  status: string;
  mockUrl?: string;
}

const PLATFORMS = [
  { id: 'wechat', name: '公众号', color: '#07C160', desc: '长文排版与正式表达', mockWidth: 420 },
  { id: 'zhihu', name: '知乎', color: '#0066FF', desc: '观点结构与逻辑推进', mockWidth: 680 },
  { id: 'bilibili', name: 'B站', color: '#FB7299', desc: '标签与导语节奏', mockWidth: 680 },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442', desc: '标题吸引与短段落表达', mockWidth: 420 },
];

const levelIcon: Record<string, typeof AlertTriangle> = { error: AlertTriangle, warning: AlertTriangle, info: Info };
const levelStyle: Record<string, string> = {
  error: 'text-red-500 bg-red-50',
  warning: 'text-amber-500 bg-amber-50',
  info: 'text-blue-500 bg-blue-50',
};

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ title: string; body: string; tags: string } | null>(null);

  const [publishing, setPublishing] = useState<Set<string>>(new Set());
  const [extPublishing, setExtPublishing] = useState<Set<string>>(new Set());
  const [publishedSet, setPublishedSet] = useState<Set<string>>(new Set());
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [extResults, setExtResults] = useState<ExtensionPublishResult[]>([]);

  const extensionReady = isExtensionInstalled();

  useEffect(() => {
    if (!id) return;
    api.getOutputs(id)
      .then((data) => setOutputs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const sortedOutputs = useMemo(() => {
    const order = PLATFORMS.map((p) => p.id);
    return [...outputs].sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
  }, [outputs]);

  const startEdit = (output: Output) => {
    setEditingId(output.id);
    setEditingData({ title: output.title, body: output.body, tags: output.tags.join(', ') });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const saveEdit = async (output: Output) => {
    if (!editingData) return;
    const newTags = editingData.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    try {
      await api.updateOutput(output.id, { title: editingData.title, body: editingData.body, tags: newTags });
      setOutputs((prev) =>
        prev.map((o) =>
          o.id === output.id ? { ...o, title: editingData.title, body: editingData.body, tags: newTags } : o,
        ),
      );
      setEditingId(null);
      setEditingData(null);
    } catch { /* keep edit state */ }
  };

  const handleMockPublish = async (output: Output) => {
    setPublishing((prev) => new Set(prev).add(output.id));
    try {
      const result = await api.publishMock(output.id);
      setPublishedSet((prev) => new Set(prev).add(output.platform));
      setPublishResults((prev) => [...prev, result]);
    } catch {
      setPublishResults((prev) => [...prev, { platformName: output.platformName, status: 'failed' }]);
    } finally {
      setPublishing((prev) => { const n = new Set(prev); n.delete(output.id); return n; });
    }
  };

  const handleRealPublish = async (output: Output) => {
    setExtPublishing((prev) => new Set(prev).add(output.id));
    try {
      const result = await publishViaExtension({
        platform: output.platform as 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu',
        content: { title: output.title, body: output.body, tags: output.tags, summary: output.summary, coverImage: output.coverImage },
        autoLayout: true,
      });
      setExtResults((prev) => [...prev, result]);
      if (result.success) setPublishedSet((prev) => new Set(prev).add(output.platform));
    } catch (err) {
      setExtResults((prev) => [...prev, {
        platform: output.platform, platformName: output.platformName, success: false,
        message: err instanceof Error ? err.message : '扩展发布失败',
      }]);
    } finally {
      setExtPublishing((prev) => { const n = new Set(prev); n.delete(output.id); return n; });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-[var(--ink-faint)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/editor')}
            className="flex items-center gap-1.5 text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors mb-3"
          >
            <ArrowLeft size={14} /> 返回编辑台
          </button>
          <h1 className="font-['Cormorant_Garamond'] text-[42px] leading-[0.92] tracking-[-0.06em] text-[var(--ink)]">
            平台预览
          </h1>
          <p className="mt-2 text-[13px] text-[var(--ink-soft)]">四个平台的适配效果，一目了然。可分别编辑、模拟发布、一键推送到真实平台。</p>
        </div>
        <div className="flex items-center gap-3">
          {extensionReady && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-[11px] font-medium">
              <Zap size={11} /> 扩展就绪
            </span>
          )}
        </div>
      </div>

      {/* Global Results */}
      {publishResults.length > 0 && (
        <div className="px-card px-soft-panel p-4">
          <h3 className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-green-700 mb-2 flex items-center gap-1.5">
            <CheckCircle size={11} /> 模拟发布结果
          </h3>
          <div className="flex flex-wrap gap-3">
            {publishResults.map((r, i) => (
              <span key={i} className="text-[12px] text-green-700 bg-green-50 px-3 py-1 rounded-full">
                {r.platformName}: {r.status === 'success' ? '成功' : '失败'}
                {r.mockUrl && (
                  <a href={r.mockUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline inline-flex items-center gap-0.5">
                    查看<ExternalLink size={10} />
                  </a>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {extResults.length > 0 && (
        <div className="px-card px-soft-panel p-4">
          <h3 className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--accent-deep)] mb-2 flex items-center gap-1.5">
            <Zap size={11} /> 真实发布结果
          </h3>
          <div className="flex flex-wrap gap-3">
            {extResults.map((r, i) => (
              <span key={i} className="text-[12px] text-[var(--accent-deep)] bg-[var(--accent)]/8 px-3 py-1 rounded-full">
                {r.platformName}: {r.success ? '成功' : '失败'} — {r.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Platform Cards */}
      {sortedOutputs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-20 text-center">
          <Globe size={24} className="mx-auto mb-3 text-[var(--ink-faint)]" />
          <p className="text-[14px] text-[var(--ink-soft)]">暂无可预览的平台内容</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedOutputs.map((output) => {
            const platform = PLATFORMS.find((p) => p.id === output.platform)!;
            const isEditing = editingId === output.id;
            const isPublishing = publishing.has(output.id);
            const isExtPublishing = extPublishing.has(output.id);
            const isPublished = publishedSet.has(output.platform);

            return (
              <motion.div
                key={output.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="px-card px-paper overflow-hidden"
                style={{ borderColor: `${platform.color}20` }}
              >
                {/* Platform Header */}
                <div
                  className="flex items-center justify-between px-6 py-4 border-b"
                  style={{ borderColor: `${platform.color}12`, backgroundColor: `${platform.color}04` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-[var(--ink)]">{platform.name}</span>
                        <span className="text-[11px] text-[var(--ink-soft)]">{platform.desc}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPublished && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">
                        <CheckCircle size={10} /> 已发布
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {isEditing && editingData ? (
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)] block mb-1.5">标题</label>
                          <input
                            value={editingData.title}
                            onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-[12px] border border-[rgba(49,56,45,0.12)] bg-white text-[14px] text-[var(--ink)] outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/8 transition-all"
                          />
                        </div>
                        <div>
                          <label className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)] block mb-1.5">正文 (HTML)</label>
                          <textarea
                            value={editingData.body}
                            onChange={(e) => setEditingData({ ...editingData, body: e.target.value })}
                            rows={12}
                            className="w-full px-4 py-3 rounded-[12px] border border-[rgba(49,56,45,0.12)] bg-white text-[13px] text-[var(--ink)] font-mono outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/8 transition-all resize-y"
                          />
                        </div>
                        <div>
                          <label className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)] block mb-1.5">标签（逗号分隔）</label>
                          <input
                            value={editingData.tags}
                            onChange={(e) => setEditingData({ ...editingData, tags: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-[12px] border border-[rgba(49,56,45,0.12)] bg-white text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/8 transition-all"
                            placeholder="标签，逗号分隔"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(output)} className="px-btn-primary text-[13px]">保存</button>
                          <button onClick={cancelEdit} className="px-btn-secondary text-[13px]">取消</button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {/* Mock Preview */}
                        <div className="flex justify-center mb-5">
                          <div
                            className="w-full rounded-[18px] overflow-hidden border bg-white"
                            style={{ maxWidth: platform.mockWidth, borderColor: `${platform.color}10` }}
                          >
                            <div
                              className="flex items-center gap-2 px-4 py-2.5 border-b"
                              style={{ borderColor: `${platform.color}10`, backgroundColor: `${platform.color}04` }}
                            >
                              <Globe size={12} style={{ color: platform.color }} />
                              <span className="text-[10px] font-semibold tracking-wide" style={{ color: platform.color }}>
                                {platform.name} 发布效果
                              </span>
                            </div>
                            <div className="p-5">
                              {output.coverImage && (
                                <img src={output.coverImage} alt="" className="w-full rounded-[12px] mb-4 object-cover max-h-48" />
                              )}
                              <h2 className="font-['Cormorant_Garamond'] text-[22px] leading-[1.15] tracking-[-0.03em] text-gray-900 mb-3">
                                {output.title}
                              </h2>
                              {output.summary && (
                                <p className="text-[12px] leading-5 text-gray-500 mb-3 italic">{output.summary}</p>
                              )}
                              <div
                                className="text-[13px] leading-7 text-gray-800"
                                style={{ wordBreak: 'break-word' }}
                                dangerouslySetInnerHTML={{ __html: output.body }}
                              />
                              {output.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-4 pt-3" style={{ borderTop: `1px solid ${platform.color}10` }}>
                                  {output.tags.map((tag, i) => (
                                    <span
                                      key={i}
                                      className="px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                                      style={{ backgroundColor: `${platform.color}0e`, color: platform.color }}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Validation */}
                        {output.validationMessages && output.validationMessages.length > 0 && (
                          <div className="space-y-1 mb-4">
                            {output.validationMessages.map((m, i) => {
                              const Icon = levelIcon[m.level] || Info;
                              const style = levelStyle[m.level] || 'text-gray-500 bg-gray-50';
                              return (
                                <p key={i} className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-[10px] ${style}`}>
                                  <Icon size={11} /> {m.field}: {m.message}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Bar */}
                  <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: `${platform.color}0d` }}>
                    {!isEditing && (
                      <button onClick={() => startEdit(output)} className="px-btn-secondary text-[12px] flex items-center gap-1.5">
                        <Edit3 size={12} /> 编辑
                      </button>
                    )}
                    {isPublished ? (
                      <span className="text-[12px] text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} /> 已发布
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleMockPublish(output)}
                          disabled={isPublishing}
                          className="px-btn-secondary text-[12px] flex items-center gap-1.5"
                        >
                          {isPublishing ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                          {isPublishing ? '模拟中…' : '模拟发布'}
                        </button>
                        {extensionReady && (
                          <button
                            onClick={() => handleRealPublish(output)}
                            disabled={isExtPublishing}
                            className="text-[12px] flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-white font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                            style={{ backgroundColor: platform.color }}
                          >
                            {isExtPublishing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            {isExtPublishing ? '发布中…' : `发布到${platform.name}`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
