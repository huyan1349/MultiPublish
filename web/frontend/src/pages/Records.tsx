import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../api/client';

interface PublishRecord {
  id: string;
  contentId: string;
  platform: string;
  platformName: string;
  status: string;
  message: string;
  mockUrl?: string;
  publishedAt: string;
}

const platformColors: Record<string, string> = {
  wechat: '#07C160',
  zhihu: '#0066FF',
  bilibili: '#FB7299',
  xiaohongshu: '#FF2442',
};

const statusLabels: Record<string, { label: string; className: string }> = {
  success: { label: '成功', className: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  failed: { label: '失败', className: 'bg-red-50 text-red-500 border-red-200' },
  publishing: { label: '发布中', className: 'bg-blue-50 text-blue-500 border-blue-200' },
};

export default function Records() {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublishRecords()
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">发布记录</h1>
        <p className="text-sm text-ink-muted mb-8">追踪所有平台的发布历史</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-surface rounded w-1/4 mb-2" />
                <div className="h-3 bg-surface rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-ink-secondary mb-1">暂无发布记录</p>
            <p className="text-xs text-ink-muted">发布文章后，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {records.map((r) => {
              const st = statusLabels[r.status] || { label: r.status, className: 'bg-gray-50 text-gray-500 border-gray-200' };
              return (
                <div key={r.id} className="card p-4 flex items-center gap-4">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: platformColors[r.platform] || '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-ink">{r.platformName}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    {r.message && (
                      <p className="text-xs text-ink-muted truncate">{r.message}</p>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted shrink-0 flex items-center gap-2">
                    {new Date(r.publishedAt).toLocaleString('zh-CN')}
                    {r.mockUrl && (
                      <a href={r.mockUrl} target="_blank" rel="noopener noreferrer"
                        className="text-brand hover:text-brand-hover">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
