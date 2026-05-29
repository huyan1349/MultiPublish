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

const statusMap: Record<string, { label: string; color: string }> = {
  success: { label: 'OK', color: 'text-emerald-500' },
  failed: { label: 'ERR', color: 'text-dot-red' },
  publishing: { label: '...', color: 'text-tx-dim' },
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
      <div className="max-w-[860px] mx-auto px-10 py-14">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-tx-faint" />
          <span className="px-label">PUBLISH LOG</span>
        </div>
        <h1 className="font-mono font-bold text-[24px] text-tx tracking-tight mb-10">发布记录</h1>

        {loading ? (
          <div className="space-y-px">
            {[1, 2, 3].map(i => (
              <div key={i} className="px-card p-4 animate-pulse">
                <div className="h-3 bg-px-surface w-1/4 mb-2" />
                <div className="h-2 bg-px-surface w-1/3" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="px-card border-dashed border-px-border p-16 text-center">
            <p className="font-mono text-[11px] text-tx-mute mb-1">NO RECORDS</p>
            <p className="text-[11px] text-tx-faint">发布文章后，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-px">
            {records.map((r) => {
              const st = statusMap[r.status] || { label: r.status, color: 'text-tx-faint' };
              const color = platformColors[r.platform] || '#555555';
              return (
                <div key={r.id} className="px-card p-4 flex items-center gap-4 hover:bg-px-hover transition-colors duration-100">
                  <div className="w-[6px] h-[6px] shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-[11px] text-tx tracking-wide">{r.platformName}</span>
                      <span className={`font-mono text-[9px] ${st.color}`}>{st.label}</span>
                    </div>
                    {r.message && (
                      <p className="font-mono text-[10px] text-tx-faint truncate">{r.message}</p>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-tx-faint shrink-0 flex items-center gap-2">
                    {new Date(r.publishedAt).toLocaleString('zh-CN')}
                    {r.mockUrl && (
                      <a href={r.mockUrl} target="_blank" rel="noopener noreferrer"
                        className="text-tx-mute hover:text-dot-red transition-colors">
                        <ExternalLink size={11} />
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
