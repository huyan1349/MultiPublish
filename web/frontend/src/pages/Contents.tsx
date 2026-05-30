import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Edit3, FileText, Inbox, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useContentStore } from '../stores/contentStore';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

export default function Contents() {
  const navigate = useNavigate();
  const { setDraft, setCurrentContentId } = useContentStore();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadContents = () => {
    setLoading(true);
    setBackendError(false);
    api.listContents()
      .then((data) => { setContents(data); setBackendError(false); })
      .catch(() => setBackendError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContents(); }, []);

  const handleEdit = async (id: string) => {
    try {
      const content = await api.getContent(id);
      setDraft({
        title: content.title,
        htmlContent: content.rawMarkdown || '',
        tags: (content.tags || []).join(', '),
        coverImage: content.coverImage || '',
      });
      setCurrentContentId(id);
      navigate(`/editor?edit=${id}`);
    } catch {
      navigate(`/editor?edit=${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteContent(id);
      setContents((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch {
      // silently fail, item stays in list
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
        <section className="px-card px-paper p-6 md:p-7">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="px-btn-ghost -ml-3 w-fit">
              <ArrowLeft size={14} />
              返回工作台
            </button>
            <div className="hidden h-10 w-px bg-[rgba(49,56,45,0.12)] xl:block" />
            <div>
              <div className="px-label mb-3">稿件管理</div>
              <h1 className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                全部稿件
              </h1>
            </div>
          </div>
        </section>

        <section className="px-card px-paper p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
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
              <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">请启动后端服务以查看稿件列表。</p>
              <button onClick={loadContents} className="px-btn-secondary mt-4">重试</button>
            </div>
          ) : contents.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-20 text-center">
              <Inbox size={20} className="mx-auto mb-4 text-[var(--accent-deep)]" />
              <p className="text-[14px] leading-7 text-[var(--ink-soft)]">还没有稿件，从「新建稿件」或「快速开始」开始创作。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contents.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(41,48,39,0.06)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => navigate(`/contents/${item.id}/preview`)}
                        className="text-left"
                      >
                        <h3 className="font-['Cormorant_Garamond'] text-[28px] leading-[0.95] tracking-[-0.04em] text-[var(--ink)] transition-colors group-hover:text-[var(--accent-deep)]">
                          {item.title || '未命名稿件'}
                        </h3>
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="px-tag">{tag}</span>
                          ))}
                          {item.tags.length > 5 && (
                            <span className="px-tag text-[var(--ink-faint)]">+{item.tags.length - 5}</span>
                          )}
                        </div>
                        <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-faint)]">
                          {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.6)] text-[var(--ink-soft)] transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 hover:text-[var(--accent-deep)]"
                        title="编辑"
                      >
                        <Edit3 size={13} />
                      </button>
                      {deleteConfirm === item.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-full bg-red-500 px-3 py-1.5 font-['IBM_Plex_Mono'] text-[10px] text-white transition-colors hover:bg-red-600"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded-full border border-[rgba(49,56,45,0.12)] bg-white px-3 py-1.5 font-['IBM_Plex_Mono'] text-[10px] text-[var(--ink-soft)] transition-colors hover:bg-[rgba(0,0,0,0.03)]"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.6)] text-[var(--ink-faint)] transition-all hover:border-red-300/40 hover:bg-red-100/60 hover:text-red-500"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <ArrowRight size={12} className="text-[var(--ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
