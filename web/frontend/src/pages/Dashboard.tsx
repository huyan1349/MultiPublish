import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PenLine, FileText, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

interface ContentItem {
  id: string; title: string; tags: string[]; updatedAt: string;
}

interface PublishRecord {
  id: string; platform: string; platformName: string; status: string;
}

const platformColors: Record<string, string> = {
  wechat: '#07C160', zhihu: '#0066FF', bilibili: '#FB7299', xiaohongshu: '#FF2442',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listContents().catch(() => [] as ContentItem[]),
      api.getPublishRecords().catch(() => [] as PublishRecord[]),
    ]).then(([c, r]) => {
      setContents(c.slice(0, 6));
      setRecords(r);
    }).finally(() => setLoading(false));
  }, []);

  const successCount = records.filter((r) => r.status === 'success').length;

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      {/* Hero */}
      <header className="mb-10">
        <h1 className="font-display text-4xl text-ink mb-3 tracking-tight">ContentBridge</h1>
        <p className="text-muted text-lg leading-relaxed max-w-xl">
          一次创作，多端适配。自动将内容转换为公众号、知乎、B站、小红书的专属风格，一键模拟发布。
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="card p-5">
          <p className="text-3xl font-display text-ink">{loading ? '—' : contents.length}</p>
          <p className="text-sm text-muted mt-1">篇内容</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-display text-ink">{loading ? '—' : records.length}</p>
          <p className="text-sm text-muted mt-1">次发布</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-display text-ink">{loading ? '—' : successCount}</p>
          <p className="text-sm text-muted mt-1">次成功</p>
        </div>
      </div>

      {/* Platform Cards */}
      <section className="mb-8">
        <h2 className="font-display text-lg text-ink mb-3">支持平台</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'wechat', name: '公众号', desc: '正式长文，层次分明' },
            { id: 'zhihu', name: '知乎', desc: '逻辑分析，结论先行' },
            { id: 'bilibili', name: 'B站', desc: '视频风格，标签驱动' },
            { id: 'xiaohongshu', name: '小红书', desc: '种草风格，短小精炼' },
          ].map((p) => (
            <div key={p.id} className="card p-4 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow duration-300">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2"
                style={{ backgroundColor: platformColors[p.id] }}>
                {p.name[0]}
              </div>
              <h3 className="font-semibold text-ink text-sm">{p.name}</h3>
              <p className="text-xs text-muted mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Contents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-ink">最近内容</h2>
          {contents.length > 0 && (
            <Link to="/editor" className="text-sm text-accent hover:underline flex items-center gap-1">
              新建 <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="card p-8 text-center text-muted text-sm">加载中…</div>
        ) : contents.length === 0 ? (
          <div className="card p-10 text-center">
            <FileText size={32} className="mx-auto text-muted/40 mb-3" />
            <p className="text-muted mb-4">还没有内容，开始你的第一篇创作</p>
            <button onClick={() => navigate('/editor')} className="btn-primary inline-flex items-center gap-2">
              <PenLine size={16} /> 开始创作
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {contents.map((c) => (
              <Link
                key={c.id}
                to={`/contents/${c.id}/preview`}
                className="card p-4 flex items-center justify-between hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-ink truncate group-hover:text-accent transition-colors">
                    {c.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={12} /> {new Date(c.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="flex gap-1">
                      {(c.tags || []).slice(0, 3).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-ink/5 text-ink/60 text-xs">{t}</span>
                      ))}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted/40 group-hover:text-accent transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
