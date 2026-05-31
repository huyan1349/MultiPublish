import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
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
  wechat: '#6f846d',
  zhihu: '#6d8aa6',
  bilibili: '#50624f',
  xiaohongshu: '#8ba287',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  success: { label: '成功', color: '#6f846d' },
  failed: { label: '失败', color: '#b94b4b' },
  publishing: { label: '发布中', color: '#50624f' },
};

export default function Records() {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);

  const loadRecords = () => {
    setLoading(true);
    setBackendError(false);
    api.getPublishRecords()
      .then((data) => { setRecords(data); setBackendError(false); })
      .catch(() => setBackendError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRecords(); }, []);

  return (
    <div className="">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
        <section className="px-card px-paper p-6 md:p-7">
          <div className="px-label mb-4">发布记录</div>
          <h1 className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">发布回执</h1>
        </section>

        <section className="px-card px-paper p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[24px] border border-[rgba(49,56,45,0.1)] p-5">
                  <div className="mb-3 h-3 w-1/3 px-shimmer" />
                  <div className="h-2 w-1/4 px-shimmer" />
                </div>
              ))}
            </div>
          ) : backendError ? (
            <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-16 text-center">
              <FileText size={18} className="mx-auto mb-4 text-[var(--accent-deep)]" />
              <p className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.18em] text-[var(--ink-faint)]">后端未连接</p>
              <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">请启动后端服务以查看发布记录。</p>
              <button onClick={loadRecords} className="px-btn-secondary mt-4">重试</button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-20 text-center">
              <Inbox size={20} className="mx-auto mb-4 text-[var(--accent-deep)]" />
              <p className="text-[14px] leading-7 text-[var(--ink-soft)]">还没有发布记录，等你发出第一篇内容后，这里会自动出现。</p>
            </div>
          ) : (
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
              }}
            >
              {records.map((record) => {
                const status = statusConfig[record.status] || { label: record.status, color: '#7f877c' };
                const color = platformColors[record.platform] || '#6b7280';
                return (
                  <motion.div
                    key={record.id}
                    className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5 transition-all duration-400 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(41,48,39,0.07)]"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1 },
                    }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="px-dot" style={{ backgroundColor: color }} />
                          <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink)]">{record.platformName}</span>
                          <span className="px-tag" style={{ color: status.color, backgroundColor: `${status.color}12` }}>{status.label}</span>
                        </div>
                        <p className="text-[13px] leading-6 text-[var(--ink-soft)]">{record.message || '没有额外说明'}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[12px] text-[var(--ink-faint)]">
                        <span>{new Date(record.publishedAt).toLocaleString('zh-CN')}</span>
                        {record.mockUrl && (
                          <a href={record.mockUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
