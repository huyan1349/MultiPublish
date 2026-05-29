import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api/client';

interface PublishRec {
  id: string; contentId: string; platform: string; platformName: string;
  status: string; message: string; mockUrl?: string; publishedAt: string;
}

const platformColors: Record<string, string> = {
  wechat: '#07C160', zhihu: '#0066FF', bilibili: '#FB7299', xiaohongshu: '#FF2442',
};

export default function PublishRecords() {
  const [records, setRecords] = useState<PublishRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublishRecords().then(setRecords).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <FileText size={24} className="text-muted" />
        <div>
          <h1 className="font-display text-2xl text-ink">发布记录</h1>
          <p className="text-muted text-sm mt-0.5">所有平台的模拟发布历史</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted mb-4">暂无发布记录</p>
          <Link to="/editor" className="btn-primary inline-flex items-center gap-2">
            去创作第一篇内容
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/6 bg-ink/[0.02]">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">平台</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">模拟链接</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted uppercase tracking-wider">发布时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-ink/[0.01] transition">
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platformColors[r.platform] || '#999' }} />
                      <span className="text-sm font-medium text-ink">{r.platformName}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} /> 成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle size={12} /> 失败
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.mockUrl ? (
                      <a href={r.mockUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                        {r.mockUrl} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted">
                    {new Date(r.publishedAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
