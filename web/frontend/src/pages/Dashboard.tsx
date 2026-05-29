import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, FileText, History, ExternalLink, Plus } from 'lucide-react';
import { api } from '../api/client';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

const platformColors: Record<string, string> = {
  wechat: '#07C160',
  zhihu: '#0066FF',
  bilibili: '#FB7299',
  xiaohongshu: '#FF2442',
};

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
      <div className="max-w-4xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">MultiPublish</h1>
        <p className="text-sm text-ink-muted mb-8">一次编写，多平台触达</p>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => navigate('/editor')}
            className="card p-5 text-left hover:shadow-card-hover transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <PenLine size={20} />
            </div>
            <h3 className="font-semibold text-ink text-sm mb-0.5">新建文章</h3>
            <p className="text-xs text-ink-muted">在编辑器中编写内容，选择平台并发布</p>
          </button>

          <button
            onClick={() => navigate('/records')}
            className="card p-5 text-left hover:shadow-card-hover transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <History size={20} />
            </div>
            <h3 className="font-semibold text-ink text-sm mb-0.5">发布记录</h3>
            <p className="text-xs text-ink-muted">查看历史发布状态和结果</p>
          </button>
        </div>

        {/* Platform badges */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">支持平台</h2>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(platformColors).map(([key, color]) => (
              <span
                key={key}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-ink-secondary"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                {key === 'wechat' ? '公众号' : key === 'zhihu' ? '知乎' : key === 'bilibili' ? 'B站' : '小红书'}
              </span>
            ))}
          </div>
        </div>

        {/* Recent Contents */}
        <div>
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">最近文章</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-surface rounded w-1/3 mb-2" />
                  <div className="h-3 bg-surface rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="card p-8 text-center">
              <FileText size={28} className="mx-auto text-ink-muted mb-2" />
              <p className="text-sm text-ink-secondary mb-1">还没有文章</p>
              <p className="text-xs text-ink-muted mb-4">点击上方「新建文章」开始创作</p>
              <button onClick={() => navigate('/editor')} className="btn-primary text-xs">
                <Plus size={14} /> 写第一篇文章
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {contents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/contents/${item.id}/preview`)}
                  className="card w-full p-4 text-left hover:shadow-card-hover transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-ink truncate mb-1">{item.title || '未命名'}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.tags.map((t, i) => (
                        <span key={i} className="text-xs text-ink-muted bg-surface px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-ink-muted group-hover:text-ink transition-colors shrink-0 ml-4">
                    <span className="text-xs">{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
                    <ExternalLink size={14} />
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
