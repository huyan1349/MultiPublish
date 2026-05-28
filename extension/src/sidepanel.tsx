import { useState, useEffect } from 'react';
import { Sparkles, Send, Loader2, ArrowLeft, Rocket, CheckCircle, XCircle, FileText, PenLine, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { useContentStore } from './sidepanel/stores/contentStore';
import { parseMarkdownToBlocks } from './sidepanel/adapters/parserService';
import { getAdapter } from './sidepanel/adapters/AdapterFactory';
import type { PlatformType, PlatformOutputDraft } from './shared/types';

import './sidepanel/styles/index.css';

type Page = 'dashboard' | 'editor' | 'preview' | 'records';

const PLATFORMS: Array<{ id: PlatformType; name: string; color: string }> = [
  { id: 'wechat', name: '公众号', color: '#07C160' },
  { id: 'zhihu', name: '知乎', color: '#0066FF' },
  { id: 'bilibili', name: 'B站', color: '#FB7299' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442' },
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export default function Sidepanel() {
  const [page, setPage] = useState<Page>('dashboard');
  const { draft, setDraft, loadDemo, contents, records, saveContent, addOutput, addRecord, loadContents, loadRecords } = useContentStore();
  const [selected, setSelected] = useState<Set<string>>(new Set(PLATFORMS.map((p) => p.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOutputs, setPreviewOutputs] = useState<Array<PlatformOutputDraft & { platform: string; platformName: string; outputId: string }>>([]);
  const [activeTab, setActiveTab] = useState('wechat');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishedSet, setPublishedSet] = useState<Set<string>>(new Set());

  useEffect(() => { loadContents(); loadRecords(); }, []);

  // === Editor Handlers ===
  const handleGenerate = () => {
    const text = draft.rawMarkdown.replace(/<[^>]*>/g, '').trim();
    if (!draft.title.trim() || !text) { setError('标题和正文不能为空'); return; }
    if (selected.size === 0) { setError('请至少选择一个平台'); return; }

    const blocks = parseMarkdownToBlocks(draft.rawMarkdown);
    const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    const standardContent = { id: genId(), title: draft.title, rawMarkdown: draft.rawMarkdown, blocks, tags, summary: draft.summary || undefined, coverImage: draft.coverImage || undefined };

    const outputs = Array.from(selected).map((pid) => {
      const adapter = getAdapter(pid as PlatformType);
      const draft2 = adapter.transform(standardContent);
      return { ...draft2, platform: pid, platformName: adapter.displayName, outputId: genId() };
    });

    // Save content
    saveContent({
      id: standardContent.id, title: draft.title, rawMarkdown: draft.rawMarkdown, tags, summary: draft.summary || undefined,
      coverImage: draft.coverImage || undefined, outputs: outputs.map((o) => ({
        id: o.outputId, platform: o.platform, platformName: o.platformName,
        title: o.title, body: o.body, tags: o.tags, status: 'ready',
        validationMessages: [],
      })), createdAt: new Date().toISOString(),
    });

    setPreviewOutputs(outputs);
    if (outputs.length > 0) setActiveTab(outputs[0].platform);
    setPage('preview');
  };

  // === Publish Handlers ===
  const publishOne = async (output: PlatformOutputDraft & { platform: string; platformName: string; outputId: string }) => {
    setPublishing(output.outputId);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PUBLISH_TO_PLATFORM',
        payload: { platform: output.platform, platformName: output.platformName, content: output },
      });
      setPublishedSet((prev) => new Set(prev).add(output.platform));
      addRecord({
        id: genId(), contentId: '', platform: output.platform, platformName: output.platformName,
        status: response.status, message: response.message, mockUrl: response.mockUrl, publishedAt: new Date().toISOString(),
      });
    } catch (err) {
      // still mark as attempted
    } finally {
      setPublishing(null);
    }
  };

  const publishAll = async () => {
    for (const output of previewOutputs) {
      await publishOne(output);
    }
  };

  // === RENDER ===
  const active = previewOutputs.find((o) => o.platform === activeTab);

  if (page === 'preview' && active) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setPage('editor')} className="text-muted hover:text-ink"><ArrowLeft size={18} /></button>
          <h2 className="font-display text-lg text-ink">平台预览</h2>
          <button onClick={publishAll} className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-medium">一键全发</button>
        </div>
        <div className="flex gap-1.5">
          {PLATFORMS.map((p) => {
            const isActive = p.id === activeTab;
            return (
              <button key={p.id} onClick={() => setActiveTab(p.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                style={{ color: isActive ? p.color : undefined, backgroundColor: isActive ? `${p.color}15` : 'transparent', border: `1px solid ${isActive ? p.color : 'transparent'}` }}>
                {p.name}{publishedSet.has(p.id) && <CheckCircle size={10} className="text-green-500" />}
              </button>
            );
          })}
        </div>
        <div className="card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-ink text-sm">{active.title}</h3>
              {active.summary && <p className="text-muted text-xs mt-0.5">{active.summary}</p>}
            </div>
            <div className="flex gap-1.5">
              {publishedSet.has(active.platform) ? (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已发布</span>
              ) : (
                <button onClick={() => publishOne(active)} disabled={publishing === active.outputId}
                  className="bg-accent text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1">
                  {publishing === active.outputId ? <Loader2 size={10} className="animate-spin" /> : <Rocket size={10} />}
                  发布
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {active.tags.map((t, i) => <span key={i} className="px-1.5 py-0.5 rounded-full bg-ink/5 text-ink/60 text-xs">{t}</span>)}
          </div>
          <div className="p-3 rounded-lg bg-ink/[0.02] border border-ink/5 max-h-64 overflow-y-auto text-xs text-ink/80"
            dangerouslySetInnerHTML={{ __html: active.body.replace(/\n/g, '<br>') }} />
        </div>
      </div>
    );
  }

  if (page === 'records') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setPage('dashboard')} className="text-muted hover:text-ink"><ArrowLeft size={18} /></button>
          <h2 className="font-display text-lg text-ink">发布记录</h2>
        </div>
        {records.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">暂无发布记录</p>
        ) : (
          <div className="space-y-2">
            {[...records].reverse().map((r) => (
              <div key={r.id} className="card p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORMS.find((p) => p.id === r.platform)?.color }} />
                  <span className="font-medium text-ink">{r.platformName}</span>
                </div>
                <span className={`text-xs ${r.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {r.status === 'success' ? <CheckCircle size={12} className="inline" /> : <XCircle size={12} className="inline" />} {r.message}
                </span>
                <span className="text-xs text-muted">{new Date(r.publishedAt).toLocaleTimeString('zh-CN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (page === 'editor') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setPage('dashboard')} className="text-muted hover:text-ink"><ArrowLeft size={18} /></button>
          <h2 className="font-display text-lg text-ink">新建内容</h2>
          <div className="flex gap-1.5">
            <button onClick={loadDemo} className="px-2.5 py-1.5 rounded-lg border border-ink/12 text-xs font-medium hover:bg-ink/5"><Sparkles size={12} className="inline mr-1" />Demo</button>
            <button onClick={handleGenerate} disabled={loading} className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}生成
            </button>
          </div>
        </div>
        {error && <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}
        <input type="text" value={draft.title} onChange={(e) => setDraft({ title: e.target.value })} placeholder="文章标题…"
          className="w-full px-3 py-2 rounded-lg border border-ink/12 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <textarea value={draft.rawMarkdown} onChange={(e) => setDraft({ rawMarkdown: e.target.value })} placeholder="正文（支持 Markdown）…" rows={10}
          className="w-full px-3 py-2 rounded-lg border border-ink/12 bg-white text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y" />
        <div className="flex gap-2">
          <input type="text" value={draft.tags} onChange={(e) => setDraft({ tags: e.target.value })} placeholder="标签，逗号分隔" className="flex-1 px-3 py-2 rounded-lg border border-ink/12 bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/30" />
          <input type="text" value={draft.coverImage} onChange={(e) => setDraft({ coverImage: e.target.value })} placeholder="封面图URL" className="flex-1 px-3 py-2 rounded-lg border border-ink/12 bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <div>
          <p className="text-xs font-medium text-ink mb-2">目标平台</p>
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORMS.map((p) => (
              <label key={p.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 cursor-pointer text-xs transition ${selected.has(p.id) ? 'border-ink/20 bg-white' : 'border-transparent bg-white/50'}`}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} className="w-3 h-3 rounded accent-accent" />
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === DASHBOARD ===
  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="font-display text-xl text-ink">ContentBridge</h1>
        <p className="text-muted text-xs mt-0.5">一次创作，多端适配，真实发布</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center"><p className="text-lg font-display text-ink">{contents.length}</p><p className="text-xs text-muted">内容</p></div>
        <div className="card p-3 text-center"><p className="text-lg font-display text-ink">{records.length}</p><p className="text-xs text-muted">发布</p></div>
        <div className="card p-3 text-center"><p className="text-lg font-display text-ink">{records.filter((r) => r.status === 'success').length}</p><p className="text-xs text-muted">成功</p></div>
      </div>

      <button onClick={() => setPage('editor')} className="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
        <PenLine size={16} />开始创作
      </button>

      <div className="flex gap-2">
        <button onClick={() => { loadRecords(); setPage('records'); }} className="flex-1 py-2 rounded-lg border border-ink/12 text-ink text-xs font-medium hover:bg-ink/5">
          <FileText size={12} className="inline mr-1" />发布记录
        </button>
      </div>

      {contents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink mb-2">最近内容</p>
          <div className="space-y-1.5">
            {[...contents].reverse().slice(0, 5).map((c) => (
              <div key={c.id} className="card p-2.5 flex items-center justify-between text-sm cursor-pointer hover:shadow-sm transition"
                onClick={() => {
                  setDraft({ title: c.title, rawMarkdown: c.rawMarkdown, tags: c.tags.join(', '), coverImage: c.coverImage || '', summary: c.summary || '' });
                  if (c.outputs && c.outputs.length > 0) {
                    setPreviewOutputs(c.outputs.map((o) => ({ ...o, platform: o.platform, outputId: o.id })) as any);
                    setActiveTab(c.outputs[0].platform);
                    setPage('preview');
                  } else {
                    setPage('editor');
                  }
                }}>
                <span className="font-medium text-ink truncate flex-1">{c.title}</span>
                <ChevronRight size={14} className="text-muted/40" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
