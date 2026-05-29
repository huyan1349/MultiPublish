import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, FileText, ArrowRight, Zap } from 'lucide-react';
import { api } from '../api/client';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

const platforms = [
  { key: 'wechat', name: '公众号', color: '#07C160', desc: '正式长文' },
  { key: 'zhihu', name: '知乎', color: '#0066FF', desc: '逻辑分析' },
  { key: 'bilibili', name: 'B站', color: '#FB7299', desc: '图文专栏' },
  { key: 'xiaohongshu', name: '小红书', color: '#FF2442', desc: '种草风格' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listContents()
      .then(setContents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[880px] mx-auto px-10 py-12">
        <div className="mb-12">
          <h1 className="font-display text-[32px] font-800 text-ink tracking-tight leading-tight">
            MultiPublish
          </h1>
          <p className="text-ink-muted text-sm mt-1.5 tracking-wide">
            一次编写，多平台触达
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12">
          <button
            onClick={() => navigate('/editor')}
            className="group relative overflow-hidden rounded-xl border border-border bg-white p-6 text-left transition-all duration-200 hover:shadow-card-hover hover:border-accent/20"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-accent rounded-r" />
            <div className="pl-3">
              <div className="flex items-center gap-2.5 mb-2">
                <PenLine size={18} className="text-accent" strokeWidth={1.5} />
                <span className="font-display font-600 text-ink text-sm">新建文章</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">在编辑器中编写内容，选择平台并发布</p>
            </div>
            <ArrowRight size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate('/records')}
            className="group relative overflow-hidden rounded-xl border border-border bg-white p-6 text-left transition-all duration-200 hover:shadow-card-hover hover:border-accent/20"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-ink-muted rounded-r" />
            <div className="pl-3">
              <div className="flex items-center gap-2.5 mb-2">
                <FileText size={18} className="text-ink-secondary" strokeWidth={1.5} />
                <span className="font-display font-600 text-ink text-sm">发布记录</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">查看历史发布状态和结果</p>
            </div>
            <ArrowRight size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        <div className="mb-12">
          <div className="section-label">支持平台</div>
          <div className="flex gap-3">
            {platforms.map((p) => (
              <div
                key={p.key}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white border border-border"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <div>
                  <div className="text-xs font-600 text-ink leading-none">{p.name}</div>
                  <div className="text-[10px] text-ink-faint mt-0.5">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="section-label">最近文章</div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg border border-border bg-white p-4 animate-pulse">
                  <div className="h-4 bg-surface-warm rounded w-1/3 mb-2" />
                  <div className="h-3 bg-surface-warm rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
              <Zap size={24} className="mx-auto text-ink-faint mb-3" strokeWidth={1.5} />
              <p className="text-sm text-ink-secondary mb-1 font-display font-500">还没有文章</p>
              <p className="text-xs text-ink-faint mb-5">点击上方「新建文章」开始创作</p>
              <button onClick={() => navigate('/editor')} className="btn-primary text-xs">
                写第一篇文章
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {contents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/contents/${item.id}/preview`)}
                  className="w-full rounded-lg border border-border bg-white p-4 text-left transition-all duration-150 hover:shadow-card-hover hover:border-accent/15 flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="font-display font-500 text-sm text-ink truncate mb-1">{item.title || '未命名'}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.tags.map((t, i) => (
                        <span key={i} className="text-[11px] text-ink-muted bg-surface-warm px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-ink-faint group-hover:text-accent transition-colors shrink-0 ml-4">
                    <span className="text-xs font-mono">{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
