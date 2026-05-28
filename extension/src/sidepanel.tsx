import { useState, useEffect } from 'react';
import { Sparkles, Send, Loader2, ArrowLeft, Rocket, CheckCircle, XCircle, FileText, PenLine, ChevronRight } from 'lucide-react';
import { useContentStore } from './sidepanel/stores/contentStore';
import { parseMarkdownToBlocks } from './sidepanel/adapters/parserService';
import { getAdapter } from './sidepanel/adapters/AdapterFactory';
import type { PlatformType, PlatformOutputDraft } from './shared/types';
import './sidepanel/styles/index.css';

type Page = 'dashboard' | 'editor' | 'preview' | 'records';

const PLATFORMS: Array<{ id: PlatformType; name: string; color: string }> = [
  { id: 'wechat', name: '公众号', color: '#07C160' },
  { id: 'zhihu', name: '知乎', color: '#448AFF' },
  { id: 'bilibili', name: 'B站', color: '#FB7299' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442' },
];

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export default function Sidepanel() {
  const [page, setPage] = useState<Page>('dashboard');
  const { draft, setDraft, loadDemo, contents, records, saveContent, addRecord, loadContents, loadRecords } = useContentStore();
  const [selected, setSelected] = useState<Set<string>>(new Set(PLATFORMS.map((p) => p.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOutputs, setPreviewOutputs] = useState<Array<PlatformOutputDraft & { platform: string; platformName: string; outputId: string }>>([]);
  const [activeTab, setActiveTab] = useState('wechat');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishedSet, setPublishedSet] = useState<Set<string>>(new Set());

  useEffect(() => { loadContents(); loadRecords(); }, []);

  const handleGenerate = () => {
    const text = draft.rawMarkdown.replace(/<[^>]*>/g, '').trim();
    if (!draft.title.trim() || !text) { setError('标题和正文不能为空'); return; }
    if (selected.size === 0) { setError('请至少选择一个平台'); return; }
    setError('');

    const blocks = parseMarkdownToBlocks(draft.rawMarkdown);
    const tags = draft.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    const sc = { id: genId(), title: draft.title, rawMarkdown: draft.rawMarkdown, blocks, tags, summary: draft.summary || undefined, coverImage: draft.coverImage || undefined };

    const outputs = Array.from(selected).map((pid) => {
      const adapter = getAdapter(pid as PlatformType);
      const d = adapter.transform(sc);
      return { ...d, platform: pid, platformName: adapter.displayName, outputId: genId() };
    });

    saveContent({
      id: sc.id, title: draft.title, rawMarkdown: draft.rawMarkdown, tags,
      outputs: outputs.map((o) => ({ id: o.outputId, platform: o.platform, platformName: o.platformName,
        title: o.title, body: o.body, tags: o.tags, status: 'ready', validationMessages: [] })),
      createdAt: new Date().toISOString(),
    });

    setPreviewOutputs(outputs);
    if (outputs.length > 0) setActiveTab(outputs[0].platform);
    setPage('preview');
  };

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
    } catch { /* ignore */ }
    setPublishing(null);
  };

  const publishAll = async () => { for (const o of previewOutputs) await publishOne(o); };

  const active = previewOutputs.find((o) => o.platform === activeTab);

  /* ══════════════ PREVIEW PAGE ══════════════ */
  if (page === 'preview' && active) {
    return (
      <div className="page">
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('editor')} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ArrowLeft size={15} /></button>
            <h2 className="title">平台预览</h2>
          </div>
          <button onClick={publishAll} className="btn btn-primary btn-sm btn-publish" style={{ gap: 4 }}>
            <Rocket size={12} /> 一键全发
          </button>
        </div>

        <div className="tabs">
          {PLATFORMS.map((p) => {
            const isActive = p.id === activeTab;
            return (
              <button key={p.id} onClick={() => setActiveTab(p.id)}
                className={`tab ${isActive ? 'active' : ''}`}
                style={{ borderColor: isActive ? p.color : undefined }}>
                <span className="tab-dot" style={{ backgroundColor: p.color }} />
                {p.name}
                {publishedSet.has(p.id) && <CheckCircle size={9} style={{ color: '#2dd4a0' }} />}
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div className="display" style={{ fontSize: 15 }}>{active.title}</div>
              {active.summary && <div className="text-dim" style={{ fontSize: 11, marginTop: 2 }}>{active.summary}</div>}
            </div>
            {publishedSet.has(active.platform) ? (
              <span className="badge badge-success"><CheckCircle size={9} />已发布</span>
            ) : (
              <button onClick={() => publishOne(active)}
                disabled={publishing === active.outputId}
                className="btn btn-primary btn-sm" style={{ gap: 4 }}>
                {publishing === active.outputId ? <Loader2 size={11} className="animate-spin" /> : <Rocket size={11} />}
                发布到此平台
              </button>
            )}
          </div>

          <div style={{ marginBottom: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {active.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
          </div>

          <div className="preview-body" dangerouslySetInnerHTML={{ __html: active.body.replace(/\n/g, '<br>') }} />
        </div>
      </div>
    );
  }

  /* ══════════════ RECORDS PAGE ══════════════ */
  if (page === 'records') {
    return (
      <div className="page">
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('dashboard')} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ArrowLeft size={15} /></button>
            <h2 className="title">发布记录</h2>
          </div>
          <span className="text-dim" style={{ fontSize: 11 }}>{records.length} 条</span>
        </div>

        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <FileText size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <p className="text-dim">暂无发布记录</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...records].reverse().map((r) => (
              <div key={r.id} className="card record-item">
                <div className="record-platform">
                  <span className="tab-dot" style={{ backgroundColor: PLATFORMS.find((p) => p.id === r.platform)?.color || '#999', width: 7, height: 7 }} />
                  <span className="name">{r.platformName}</span>
                </div>
                <span className={`record-status ${r.status === 'success' ? 'success' : 'failed'}`}>
                  {r.status === 'success' ? <CheckCircle size={10} style={{ display:'inline', marginRight:2 }} /> : <XCircle size={10} style={{ display:'inline', marginRight:2 }} />}
                  {r.status === 'success' ? '成功' : '失败'}
                </span>
                <span className="record-time">{new Date(r.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ══════════════ EDITOR PAGE ══════════════ */
  if (page === 'editor') {
    return (
      <div className="page">
        <div className="header">
          <div className="header-left">
            <button onClick={() => setPage('dashboard')} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><ArrowLeft size={15} /></button>
            <h2 className="title">新建内容</h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { loadDemo(); setError(''); }} className="btn btn-ghost btn-sm"><Sparkles size={12} /> Demo</button>
            <button onClick={handleGenerate} disabled={loading} className="btn btn-primary btn-sm" style={{ gap: 4 }}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}生成
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(255,36,66,0.1)', border: '1px solid rgba(255,36,66,0.2)', color: '#ff6b7a', fontSize: 11 }}>{error}</div>
        )}

        <input
          type="text" value={draft.title} onChange={(e) => setDraft({ title: e.target.value })}
          placeholder="文章标题…" className="input"
          style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)' }}
        />

        <textarea
          value={draft.rawMarkdown} onChange={(e) => setDraft({ rawMarkdown: e.target.value })}
          placeholder="正文（支持 Markdown 和 HTML）…" className="editor-body"
        />

        <div className="input-row">
          <input type="text" value={draft.tags} onChange={(e) => setDraft({ tags: e.target.value })} placeholder="标签，逗号分隔" className="input" />
          <input type="text" value={draft.coverImage} onChange={(e) => setDraft({ coverImage: e.target.value })} placeholder="封面图URL" className="input" />
        </div>

        <div>
          <div className="help-text" style={{ marginBottom: 6 }}>目标平台</div>
          <div className="platform-grid">
            {PLATFORMS.map((p) => (
              <label key={p.id} className={`platform-pill ${selected.has(p.id) ? 'active' : ''}`}>
                <input type="checkbox" checked={selected.has(p.id)}
                  onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
                <span className="dot" style={{ backgroundColor: p.color }} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ DASHBOARD ══════════════ */
  const successCount = records.filter((r) => r.status === 'success').length;
  return (
    <div className="page">
      <div className="header" style={{ marginBottom: 2 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo">C</div>
            <h1 className="title">ContentBridge</h1>
          </div>
          <p className="subtitle">一次创作 · 多端适配 · 真实发布</p>
        </div>
      </div>

      <div className="stats">
        <div className="card stat-card">
          <div className="stat-value">{contents.length}</div>
          <div className="stat-label">内容</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{records.length}</div>
          <div className="stat-label">发布</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{successCount}</div>
          <div className="stat-label">成功</div>
        </div>
      </div>

      <button onClick={() => { setError(''); setPage('editor'); }} className="btn btn-primary btn-block" style={{ padding: '11px', fontSize: 13, gap: 8 }}>
        <PenLine size={15} /> 开始创作
      </button>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => { loadRecords(); setPage('records'); }} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
          <FileText size={12} /> 发布记录
        </button>
      </div>

      {contents.length > 0 && (
        <div>
          <div className="help-text" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>最近内容</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[...contents].reverse().slice(0, 5).map((c) => (
              <div key={c.id} className="card card-clickable record-item"
                onClick={() => {
                  setDraft({ title: c.title, rawMarkdown: c.rawMarkdown, tags: c.tags.join(', '), coverImage: c.coverImage || '', summary: c.summary || '' });
                  if (c.outputs?.length) {
                    setPreviewOutputs(c.outputs.map((o: any) => ({ ...o, outputId: o.id })));
                    setActiveTab(c.outputs[0].platform);
                    setPage('preview');
                  } else { setPage('editor'); }
                }}>
                <span className="name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
