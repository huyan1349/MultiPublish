import { useEffect, useState } from 'react';
import { ExternalLink, Inbox } from 'lucide-react';
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

const statusConfig: Record<string, { label: string; color: string }> = {
  success: { label: '成功', color: '#07C160' },
  failed: { label: '失败', color: '#FF3B30' },
  publishing: { label: '发布中', color: '#0066FF' },
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
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[860px] mx-auto px-12 py-16">
        <div className="flex items-center gap-3 mb-3 px-fade-in">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">RECORDS</span>
        </div>
        <h1 className="font-mono font-bold text-[28px] text-tx tracking-tight mb-2 px-fade-in">
          发布记录
        </h1>
        <p className="text-[12px] text-tx-dim mb-12 px-fade-in px-stagger-1" style={{ animationFillMode: 'both' }}>追踪所有平台的发布历史</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="px-card p-5">
                <div className="h-3 px-shimmer w-1/3 mb-2" />
                <div className="h-2 px-shimmer w-1/4" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="px-card border-dashed border-px-border p-16 text-center px-fade-in">
            <Inbox size={24} className="mx-auto text-tx-faint mb-4 px-float" strokeWidth={1.5} />
            <p className="font-mono text-[11px] text-tx-mute mb-1">NO RECORDS YET</p>
            <p className="text-[11px] text-tx-faint">发布文章后，记录会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-1">
            {records.map((r, idx) => {
              const st = statusConfig[r.status] || { label: r.status, color: '#999999' };
              const color = platformColors[r.platform] || '#6b7280';
              return (
                <div
                  key={r.id}
                  className="px-card p-5 flex items-center gap-4 group px-fade-in"
                  style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'both' }}
                >
                  <div className="relative flex-shrink-0">
                    <div className="px-dot" style={{ backgroundColor: color, width: 8, height: 8 }} />
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-[6px] h-[6px] rounded-full border-2 border-white"
                      style={{ backgroundColor: st.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-xs text-tx">{r.platformName}</span>
                      <span className="px-tag" style={{ color: st.color, backgroundColor: `${st.color}12` }}>{st.label}</span>
                    </div>
                    {r.message && (
                      <p className="text-[11px] text-tx-faint truncate">{r.message}</p>
                    )}
                  </div>
                  <div className="text-[11px] text-tx-faint shrink-0 flex items-center gap-2 font-mono tabular-nums">
                    {new Date(r.publishedAt).toLocaleString('zh-CN')}
                    {r.mockUrl && (
                      <a href={r.mockUrl} target="_blank" rel="noopener noreferrer"
                        className="text-tx-dim hover:text-tx transition-colors" aria-label="查看外部链接">
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
