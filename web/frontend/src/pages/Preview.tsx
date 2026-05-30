import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Rocket, CheckCircle, XCircle, AlertTriangle,
  Info, Loader2, Zap, ClipboardCopy, Sparkles, Edit3, Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { publishViaExtension, isExtensionInstalled, type ExtensionPublishResult } from '../utils/extensionBridge';

interface Output {
  id: string; platform: string; platformName: string;
  title: string; summary?: string; body: string; tags: string[];
  coverImage?: string; extra?: Record<string, unknown>;
  validationMessages: Array<{ level: string; field: string; message: string }>;
  status: string;
}

interface PublishState {
  status: 'idle' | 'publishing' | 'success' | 'failed';
  message?: string;
}

const TABS = [
  { id: 'wechat', name: '公众号', color: '#07C160', icon: '💬' },
  { id: 'zhihu', name: '知乎', color: '#0066FF', icon: '📘' },
  { id: 'bilibili', name: 'B站', color: '#FB7299', icon: '📺' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442', icon: '📕' },
];

const PLATFORM_HINTS: Record<string, string> = {
  wechat: '📋 点击发布后内容将复制到剪贴板，在公众号编辑器中 Ctrl+V 粘贴即可',
  zhihu: '🤖 自动填充 + 自动点击发布，无需手动操作',
  bilibili: '✍️ 自动填充标题和正文，需手动确认发布',
  xiaohongshu: '🤖 一键排版后自动发布（排版→下一步→发布）',
};

const levelIcon = { error: XCircle, warning: AlertTriangle, info: Info };
const levelColor = { error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500' };

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [activeTab, setActiveTab] = useState('wechat');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string; title: string; body: string; tags: string } | null>(null);
  const [publishStates, setPublishStates] = useState<Record<string, PublishState>>({});
  const [autoLayout, setAutoLayout] = useState(true);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'rendered' | 'source'>('rendered');
  const extensionReady = isExtensionInstalled();

  useEffect(() => {
    if (!id) return;
    api.getOutputs(id).then((data) => {
      setOutputs(data);
      if (data.length > 0) setActiveTab(data[0].platform);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const active = outputs.find((o) => o.platform === activeTab);

  const setPublishStatus = useCallback((platform: string, state: PublishState) => {
    setPublishStates((prev) => ({ ...prev, [platform]: state }));
  }, []);

  const handleEdit = (output: Output) => {
    setEditing({ id: output.id, title: output.title, body: output.body, tags: output.tags.join(', ') });
  };

  const handleSave = async () => {
    if (!editing) return;
    await api.updateOutput(editing.id, {
      title: editing.title,
      body: editing.body,
      tags: editing.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    });
    setOutputs((prev) => prev.map((o) => o.id === editing.id
      ? { ...o, title: editing.title, body: editing.body, tags: editing.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) }
      : o));
    setEditing(null);
  };

  const handlePublish = async (output: Output) => {
    setPublishStatus(output.platform, { status: 'publishing' });

    try {
      if (output.platform === 'wechat') {
        const html = output.body || '';
        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([html.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
        ]);

        if (extensionReady) {
          publishViaExtension({
            platform: 'wechat',
            content: { title: output.title, body: output.body, tags: output.tags },
            autoLayout: true,
          }).catch(() => {});
        }

        setPublishStatus(output.platform, {
          status: 'success',
          message: '内容已复制到剪贴板，请在公众号编辑器中 Ctrl+V 粘贴',
        });
        return;
      }

      if (extensionReady) {
        const result = await publishViaExtension({
          platform: output.platform as 'zhihu' | 'bilibili' | 'xiaohongshu',
          content: {
            title: output.title,
            body: output.body,
            tags: output.tags,
            summary: output.summary,
            coverImage: output.coverImage,
          },
          autoLayout: output.platform === 'xiaohongshu' ? autoLayout : true,
        });

        setPublishStatus(output.platform, {
          status: result.success ? 'success' : 'failed',
          message: result.message,
        });
        return;
      }

      const result = await api.publishMock(output.id);
      setPublishStatus(output.platform, {
        status: result.status === 'success' ? 'success' : 'failed',
        message: result.message,
      });
    } catch (err) {
      setPublishStatus(output.platform, {
        status: 'failed',
        message: err instanceof Error ? err.message : '发布失败',
      });
    }
  };

  const handleBatchPublish = async () => {
    setBatchPublishing(true);
    for (const output of outputs) {
      const ps = publishStates[output.platform];
      if (ps?.status === 'success') continue;
      await handlePublish(output);
    }
    setBatchPublishing(false);
  };

  const handleCopyHtml = async (output: Output) => {
    try {
      const html = output.body || '';
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([html.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
      ]);
      setPublishStatus(output.platform, { status: 'success', message: 'HTML 已复制到剪贴板' });
    } catch {
      setPublishStatus(output.platform, { status: 'failed', message: '复制失败' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-ink-faint" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/editor')} className="text-ink-faint hover:text-ink transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl text-ink tracking-tight">平台预览</h1>
            <p className="text-ink-faint text-xs mt-0.5">查看各平台适配效果并一键发布</p>
          </div>
          {extensionReady && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
              <Zap size={12} /> 扩展已连接
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBatchPublish}
            disabled={batchPublishing}
            className="btn-primary flex items-center gap-2"
          >
            {batchPublishing ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {batchPublishing ? '发布中…' : '一键发布全部'}
          </button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => {
          const isActive = t.id === activeTab;
          const ps = publishStates[t.id];
          const hasOutput = outputs.some((o) => o.platform === t.id);
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setEditing(null); }}
              disabled={!hasOutput}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2"
              style={{
                color: isActive ? t.color : 'var(--ink-faint)',
                borderColor: isActive ? t.color : 'transparent',
                backgroundColor: isActive ? `${t.color}08` : 'transparent',
                opacity: hasOutput ? 1 : 0.4,
              }}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
              {ps?.status === 'success' && <CheckCircle size={14} className="text-green-500" />}
              {ps?.status === 'failed' && <XCircle size={14} className="text-red-500" />}
              {ps?.status === 'publishing' && <Loader2 size={14} className="animate-spin" />}
            </button>
          );
        })}
      </div>

      {/* Content Panel */}
      {active && (
        <div className="bg-white rounded-2xl border border-[var(--line)] shadow-[var(--shadow-soft)] overflow-hidden">
          {/* Platform Header Bar */}
          <div
            className="px-6 py-3 border-b border-[var(--line)] flex items-center justify-between"
            style={{ backgroundColor: `${TABS.find((t) => t.id === active.platform)?.color}06` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{TABS.find((t) => t.id === active.platform)?.icon}</span>
              <span className="font-medium text-sm" style={{ color: TABS.find((t) => t.id === active.platform)?.color }}>
                {active.platformName}
              </span>
              <span className="text-xs text-ink-faint">
                标题 {active.title.length} 字 · 正文 {active.body.length} 字 · 标签 {active.tags.length} 个
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(previewMode === 'rendered' ? 'source' : 'rendered')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-ink-faint hover:text-ink hover:bg-ink/5 transition"
              >
                {previewMode === 'rendered' ? <Edit3 size={12} /> : <Eye size={12} />}
                {previewMode === 'rendered' ? '源码' : '预览'}
              </button>
              <button
                onClick={() => handleCopyHtml(active)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-ink-faint hover:text-ink hover:bg-ink/5 transition"
              >
                <ClipboardCopy size={12} /> 复制HTML
              </button>
            </div>
          </div>

          <div className="p-6">
            {editing && editing.id === active.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-ink-faint mb-1 block">标题</label>
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-ink font-semibold focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-faint mb-1 block">正文 (HTML)</label>
                  <textarea
                    value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    rows={14}
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-ink font-mono text-sm resize-y focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-faint mb-1 block">标签（逗号分隔）</label>
                  <input
                    value={editing.tags}
                    onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-ink text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="btn-primary text-sm">保存修改</button>
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm">取消</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-ink leading-snug">{active.title}</h2>
                    {active.summary && (
                      <p className="text-ink-faint text-sm mt-1.5 line-clamp-2">{active.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(active)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink-soft hover:text-ink hover:bg-ink/5 border border-[var(--line)] transition"
                    >
                      <Edit3 size={12} /> 编辑
                    </button>
                    <button
                      onClick={() => handlePublish(active)}
                      disabled={publishStates[active.platform]?.status === 'publishing'}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs text-white font-medium transition shadow-sm hover:shadow-md disabled:opacity-50"
                      style={{ backgroundColor: TABS.find((t) => t.id === active.platform)?.color }}
                    >
                      {publishStates[active.platform]?.status === 'publishing' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Rocket size={14} />
                      )}
                      {publishStates[active.platform]?.status === 'publishing' ? '发布中…' : '发布'}
                    </button>
                  </div>
                </div>

                {publishStates[active.platform] && publishStates[active.platform].status !== 'idle' && (
                  <div
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${
                      publishStates[active.platform].status === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : publishStates[active.platform].status === 'failed'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {publishStates[active.platform].status === 'success' && <CheckCircle size={16} />}
                    {publishStates[active.platform].status === 'failed' && <XCircle size={16} />}
                    {publishStates[active.platform].status === 'publishing' && <Loader2 size={16} className="animate-spin" />}
                    <span>{publishStates[active.platform].message}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink/[0.02] text-xs text-ink-faint">
                  {active.platform === 'xiaohongshu' ? (
                    <>
                      <Sparkles size={12} className="text-[#FF2442]" />
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoLayout}
                          onChange={(e) => setAutoLayout(e.target.checked)}
                          className="accent-[#FF2442] w-3.5 h-3.5"
                        />
                        一键排版后自动发布（排版→下一步→发布）
                      </label>
                    </>
                  ) : (
                    <>
                      {active.platform === 'wechat' ? (
                        <ClipboardCopy size={12} className="text-[#07C160]" />
                      ) : (
                        <Info size={12} />
                      )}
                      <span>{PLATFORM_HINTS[active.platform]}</span>
                    </>
                  )}
                </div>

                {active.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {active.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${TABS.find((tab) => tab.id === active.platform)?.color}10`,
                          color: TABS.find((tab) => tab.id === active.platform)?.color,
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-[var(--line)] overflow-hidden">
                  <div className="px-4 py-2 bg-ink/[0.02] border-b border-[var(--line)] flex items-center justify-between">
                    <span className="text-xs text-ink-faint">
                      {previewMode === 'rendered' ? '渲染预览' : 'HTML 源码'}
                    </span>
                    <span className="text-xs text-ink-faint">{active.body.length} 字符</span>
                  </div>
                  <div className="p-4 max-h-[480px] overflow-y-auto">
                    {previewMode === 'rendered' ? (
                      <div
                        className="prose prose-sm max-w-none text-ink/85"
                        dangerouslySetInnerHTML={{ __html: active.body }}
                      />
                    ) : (
                      <pre className="text-xs font-mono text-ink-soft whitespace-pre-wrap break-all leading-relaxed">
                        {active.body}
                      </pre>
                    )}
                  </div>
                </div>

                {active.validationMessages && active.validationMessages.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-[var(--line)]">
                    <span className="text-xs font-medium text-ink-soft">校验结果</span>
                    {active.validationMessages.map((m, i) => {
                      const Icon = levelIcon[m.level as keyof typeof levelIcon] || Info;
                      return (
                        <p key={i} className={`flex items-center gap-1.5 text-xs ${levelColor[m.level as keyof typeof levelColor] || 'text-ink-faint'}`}>
                          <Icon size={12} /> [{m.field}] {m.message}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!active && outputs.length === 0 && (
        <div className="text-center py-20">
          <p className="text-ink-faint">暂无预览内容，请先在编辑页生成各平台适配</p>
          <button onClick={() => navigate('/editor')} className="btn-primary mt-4 text-sm">
            前往编辑
          </button>
        </div>
      )}
    </div>
  );
}
