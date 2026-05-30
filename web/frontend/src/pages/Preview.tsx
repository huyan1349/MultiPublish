import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Rocket, CheckCircle, XCircle, AlertTriangle, Info, Loader2, ExternalLink, Zap } from 'lucide-react';
import { api } from '../api/client';
import { publishViaExtension, isExtensionInstalled, type ExtensionPublishResult } from '../utils/extensionBridge';

interface Output {
  id: string; platform: string; platformName: string;
  title: string; summary?: string; body: string; tags: string[];
  coverImage?: string; extra?: Record<string, unknown>;
  validationMessages: Array<{ level: string; field: string; message: string }>;
  status: string;
}

const TABS = [
  { id: 'wechat', name: '公众号', color: '#07C160' },
  { id: 'zhihu', name: '知乎', color: '#0066FF' },
  { id: 'bilibili', name: 'B站', color: '#FB7299' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442' },
];

const levelIcon = { error: XCircle, warning: AlertTriangle, info: Info };
const levelColor = { error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500' };

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [activeTab, setActiveTab] = useState('wechat');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [singlePublishing, setSinglePublishing] = useState<string | null>(null);
  const [publishedSet, setPublishedSet] = useState<Set<string>>(new Set());
  const [publishResults, setPublishResults] = useState<Array<{ platformName: string; status: string; mockUrl?: string }> | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string; body: string; tags: string } | null>(null);
  const [extPublishing, setExtPublishing] = useState<string | null>(null);
  const [extResults, setExtResults] = useState<ExtensionPublishResult[]>([]);
  const extensionReady = isExtensionInstalled();

  useEffect(() => {
    if (!id) return;
    api.getOutputs(id).then((data) => {
      setOutputs(data);
      if (data.length > 0) setActiveTab(data[0].platform);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const active = outputs.find((o) => o.platform === activeTab);

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

  const handleSinglePublish = async (outputId: string, platform: string) => {
    setSinglePublishing(outputId);
    try {
      const result = await api.publishMock(outputId);
      setPublishedSet((prev) => new Set(prev).add(platform));
      setPublishResults((prev) => [...(prev || []), result]);
    } catch {
      setPublishResults((prev) => [...(prev || []), { platformName: platform, status: 'failed' }]);
    } finally {
      setSinglePublishing(null);
    }
  };

  const handleBatchPublish = async () => {
    setPublishing(true);
    try {
      const results = await api.batchPublishMock(outputs.map((o) => o.id));
      setPublishResults(results);
    } catch {
      setPublishResults([{ platformName: 'error', status: 'failed' }]);
    } finally {
      setPublishing(false);
    }
  };

  const handleExtensionPublish = async (output: Output) => {
    setExtPublishing(output.platform);
    try {
      const result = await publishViaExtension({
        platform: output.platform as 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu',
        content: {
          title: output.title,
          body: output.body,
          tags: output.tags,
          summary: output.summary,
          coverImage: output.coverImage,
        },
        autoLayout: true,
      });
      setExtResults((prev) => [...prev, result]);
      if (result.success) {
        setPublishedSet((prev) => new Set(prev).add(output.platform));
      }
    } catch (err) {
      setExtResults((prev) => [...prev, {
        platform: output.platform,
        platformName: output.platformName,
        success: false,
        message: err instanceof Error ? err.message : '扩展发布失败',
      }]);
    } finally {
      setExtPublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/editor')} className="text-muted hover:text-ink transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl text-ink">平台预览</h1>
          {extensionReady && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <Zap size={12} /> 扩展已连接
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {extensionReady && (
            <button
              onClick={() => outputs.forEach((o) => handleExtensionPublish(o))}
              disabled={extPublishing !== null}
              className="btn-primary flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {extPublishing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {extPublishing ? '真实发布中…' : '真实全发'}
            </button>
          )}
          <button onClick={handleBatchPublish} disabled={publishing} className="btn-secondary flex items-center gap-2">
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {publishing ? '模拟发布中…' : '模拟全发'}
          </button>
        </div>
      </div>

      {/* Extension Publish Results */}
      {extResults.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2"><Zap size={16} /> 扩展真实发布结果</h3>
          <div className="space-y-1">
            {extResults.map((r, i) => (
              <p key={i} className="text-sm text-blue-700">
                {r.platformName}: {r.success ? '✅ ' : '❌ '}{r.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Mock Publish Results Banner */}
      {publishResults && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2"><CheckCircle size={16} /> 模拟发布完成</h3>
          <div className="space-y-1">
            {publishResults.map((r, i) => (
              <p key={i} className="text-sm text-green-700">
                {r.platformName}: {r.status === 'success' ? '✅ 成功' : '❌ 失败'}
                {r.mockUrl && <span className="text-green-600 ml-2">({r.mockUrl})</span>}
              </p>
            ))}
          </div>
          <button onClick={() => navigate('/publish-records')} className="mt-3 text-sm text-accent hover:underline">
            查看发布记录 →
          </button>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setEditing(null); }}
              className="platform-tab flex items-center gap-1.5"
              style={{
                color: isActive ? t.color : undefined,
                borderColor: isActive ? t.color : 'transparent',
                backgroundColor: isActive ? `${t.color}10` : 'transparent',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {t.name}
              {publishedSet.has(t.id) && (
                <CheckCircle size={12} className="text-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Panel */}
      {active && (
        <div className="card p-6">
          {editing && editing.id === active.id ? (
            <div className="space-y-4">
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full px-3 py-2 border border-ink/12 rounded-lg text-ink font-semibold"
              />
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={12}
                className="w-full px-3 py-2 border border-ink/12 rounded-lg text-ink font-mono text-sm resize-y"
              />
              <input
                value={editing.tags}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                className="w-full px-3 py-2 border border-ink/12 rounded-lg text-ink text-sm"
                placeholder="标签，逗号分隔"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="btn-primary text-sm">保存</button>
                <button onClick={() => setEditing(null)} className="btn-secondary text-sm">取消</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{active.title}</h2>
                  {active.summary && <p className="text-muted text-sm mt-1">{active.summary}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {publishedSet.has(active.platform) ? (
                    <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2.5 py-1.5 rounded-lg">
                      <CheckCircle size={13} /> 已发布
                    </span>
                  ) : (
                    <>
                      {extensionReady && (
                        <button
                          onClick={() => handleExtensionPublish(active)}
                          disabled={extPublishing === active.platform}
                          className="btn-primary text-sm flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          {extPublishing === active.platform ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Zap size={14} />
                          )}
                          真实发布
                        </button>
                      )}
                      <button
                        onClick={() => handleSinglePublish(active.id, active.platform)}
                        disabled={singlePublishing === active.id}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                      >
                        {singlePublishing === active.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Rocket size={14} />
                        )}
                        模拟发布
                      </button>
                    </>
                  )}
                  <button onClick={() => handleEdit(active)} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Send size={14} /> 编辑
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {active.tags.map((t, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full bg-ink/5 text-ink/70 text-xs">{t}</span>
                ))}
              </div>

              {/* Body Preview */}
              <div className="p-4 rounded-lg bg-ink/[0.02] border border-ink/5 max-h-96 overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none text-ink/85"
                  dangerouslySetInnerHTML={{ __html: active.body.replace(/\n/g, '<br/>') }}
                />
              </div>

              {/* Validation Messages */}
              {active.validationMessages && active.validationMessages.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-ink/6">
                  {active.validationMessages.map((m, i) => {
                    const Icon = levelIcon[m.level as keyof typeof levelIcon] || Info;
                    return (
                      <p key={i} className={`flex items-center gap-1.5 text-xs ${levelColor[m.level as keyof typeof levelColor] || 'text-muted'}`}>
                        <Icon size={12} /> {m.message}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
