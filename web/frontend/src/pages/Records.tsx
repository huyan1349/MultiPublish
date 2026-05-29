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
  wechat: '#07C160', zhihu: '#0066FF', bilibili: '#FB7299', xiaohongshu: '#FF2442',
};

const statusConfig: Record<string, { label: string; dot: string }> = {
  success: { label: '成功', dot: 'bg-emerald-400' },
  failed: { label: '失败', dot: 'bg-red-400' },
  publishing: { label: '发布中', dot: 'bg-blue-400 animate-pulse' },
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
      <div className="max-w-[880px] mx-auto px-10 py-12">
        <h1 className="font-display text-[28px] font-700 text-ink tracking-tight mb-1">发布记录</h1>
        <p className="text-sm text-ink-muted mb-10">追踪所有平台的发布历史</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-border bg-white p-4 animate-pulse">
                <div className="h-4 bg-surface-warm rounded w-1/4 mb-2" />
                <div className="h-3 bg-surface-warm rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-16 text-center">
            <p className="text-sm text-ink-secondary mb-1 font-display font-500">暂无发布记录</p>
            <p className="text-xs text-ink-faint">发布文章后，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-1">
            {records.map((r) => {
              const st = statusConfig[r.status] || { label: r.status, dot: 'bg-gray-400' };
              const color = platformColors[r.platform] || '#6b7280';
              return (
                <div key={r.id} className="rounded-lg border border-border bg-white p-4 flex items-center gap-4 hover:shadow-card transition-shadow">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white ${st.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display font-500 text-sm text-ink">{r.platformName}</span>
                      <span className="text-[10px] text-ink-muted bg-surface-warm px-1.5 py-0.5 rounded">{st.label}</span>
                    </div>
                    {r.message && (
                      <p className="text-[11px] text-ink-faint truncate">{r.message}</p>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-faint shrink-0 flex items-center gap-2 font-mono">
                    {new Date(r.publishedAt).toLocaleString('zh-CN')}
                    {r.mockUrl && (
                      <a href={r.mockUrl} target="_blank" rel="noopener noreferrer"
                        className="text-accent hover:text-accent-hover transition-colors">
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
