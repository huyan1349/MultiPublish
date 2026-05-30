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
      <div className="max-w-[880px] mx-auto px-12 py-16">
        <div className="flex items-center gap-3 mb-3 px-reveal-up">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">RECORDS</span>
        </div>
        <h1 className="font-serif text-[32px] text-tx tracking-tight mb-2 px-reveal-up" style={{ animationDelay: '0.05s' }}>
          发布记录
        </h1>
        <p className="font-sans text-[13px] text-tx-dim mb-14 px-reveal-up" style={{ animationDelay: '0.1s' }}>
          追踪所有平台的发布历史
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-card p-6 px-reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="h-3 px-shimmer w-1/4 mb-3" />
                <div className="h-2 px-shimmer w-1/3 mb-2" />
                <div className="h-2 px-shimmer w-1/6" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="px-card border-dashed border-px-border p-20 text-center px-fade-in dot-grid">
            <div className="relative z-10">
              <Inbox size={28} className="mx-auto text-tx-faint mb-5 px-float" strokeWidth={1.5} />
              <p className="font-mono font-bold text-[11px] text-tx-mute mb-2 tracking-wide">NO RECORDS YET</p>
              <p className="font-sans text-[12px] text-tx-faint">发布文章后，记录会显示在这里</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r, idx) => {
              const st = statusConfig[r.status] || { label: r.status, color: '#999999' };
              const color = platformColors[r.platform] || '#6b7280';
              return (
                <div
                  key={r.id}
                  className="px-card px-reveal-up group"
                  style={{
                    animationDelay: `${idx * 0.04}s`,
                    borderTop: `2px solid ${color}`,
                  }}
                >
                  <div className="p-5 flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white"
                        style={{ backgroundColor: st.color }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="font-mono font-bold text-[11px] text-tx tracking-wide">
                          {r.platformName.toUpperCase()}
                        </span>
                        <span
                          className="font-mono text-[8px] font-bold px-2 py-0.5 tracking-wider"
                          style={{ color: st.color, backgroundColor: `${st.color}10` }}
                        >
                          {st.label}
                        </span>
                      </div>
                      {r.message && (
                        <p className="font-sans text-[11px] text-tx-faint truncate">{r.message}</p>
                      )}
                    </div>

                    <div className="text-[11px] text-tx-faint shrink-0 flex items-center gap-3 font-mono tabular-nums">
                      <span>{new Date(r.publishedAt).toLocaleString('zh-CN')}</span>
                      {r.mockUrl && (
                        <a
                          href={r.mockUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-tx-dim hover:text-tx transition-colors p-1 hover:bg-px-surface"
                          aria-label="查看外部链接"
                        >
                          <ExternalLink size={13} strokeWidth={1.5} />
                        </a>
                      )}
                    </div>
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
