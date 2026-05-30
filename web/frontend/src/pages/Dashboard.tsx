import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, FileText, PenLine, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import BrandMark from '../components/brand/BrandMark';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

const platformNotes = [
  { key: 'wechat', name: '公众号', color: '#6f846d', note: '长文排版与正式表达' },
  { key: 'zhihu', name: '知乎', color: '#6d8aa6', note: '观点结构与逻辑推进' },
  { key: 'bilibili', name: 'B站', color: '#50624f', note: '标签与导语节奏' },
  { key: 'xiaohongshu', name: '小红书', color: '#8ba287', note: '标题吸引与短段落表达' },
];

const inspirationPrompts = [
  '写一段关于安静工作台的开场白',
  '把同一篇文章改出公众号和小红书的差异',
  '给这篇内容想三个更有传播性的标题',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listContents().then(setContents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const latest = contents[0];
  const draftCount = contents.length;
  const thisWeekCount = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return contents.filter((item) => new Date(item.updatedAt).getTime() >= weekAgo).length;
  }, [contents]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
          <div className="px-card px-paper p-6">
            <div className="px-label mb-4">工作台</div>
            <div className="space-y-4">
              <button onClick={() => navigate('/editor')} className="w-full rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[var(--ink)] p-5 text-left text-white transition-transform duration-200 hover:-translate-y-0.5">
                <div className="mb-6 flex items-center justify-between">
                  <PenLine size={16} />
                  <ArrowRight size={14} />
                </div>
                <div className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em]">
                  新建稿件
                </div>
                <p className="mt-3 text-[13px] leading-6 text-white/72">进入编辑台，开始写作与平台适配。</p>
              </button>

              <button onClick={() => navigate('/inspiration')} className="w-full rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.7)] p-5 text-left transition-transform duration-200 hover:-translate-y-0.5">
                <div className="mb-6 flex items-center justify-between text-[var(--accent-deep)]">
                  <Sparkles size={16} />
                  <ArrowRight size={14} />
                </div>
                <div className="font-['Cormorant_Garamond'] text-[30px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  灵感面板
                </div>
                <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">生成标题、角度和大纲，再回到编辑台继续写。</p>
              </button>
            </div>
          </div>

          <div className="px-card px-paper p-6 md:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-[560px]">
                <div className="px-label mb-4">内容中枢</div>
                <div className="mb-5 flex items-center gap-4">
                  <BrandMark size={64} rounded={24} />
                  <div>
                    <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                      MultiPublish
                    </div>
                    <div className="mt-2 text-[13px] text-[var(--ink-soft)]">
                      一次写作，多端真实分发
                    </div>
                  </div>
                </div>
                <h1 className="font-['Cormorant_Garamond'] text-[58px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                  一个真正用于写作、
                  <br />
                  调整和分发的编辑工具。
                </h1>
                <p className="mt-5 text-[14px] leading-7 text-[var(--ink-soft)]">
                  这里不是展示页，而是你的内容工作台。写正文、看平台限制、调用灵感、预览结果、发送到扩展，整条链路在同一个地方完成。
                </p>
              </div>

              <div className="grid gap-3 md:min-w-[260px]">
                <div className="rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.68)] p-4">
                  <div className="px-label mb-3">当前状态</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.04em] text-[var(--ink)]">
                        {draftCount}
                      </div>
                      <div className="mt-2 text-[12px] text-[var(--ink-soft)]">已保存稿件</div>
                    </div>
                    <div className="px-dot px-pulse-dot bg-[var(--accent)]" />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.68)] p-4">
                  <div className="px-label mb-3">本周更新</div>
                  <div className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.04em] text-[var(--ink)]">
                    {thisWeekCount}
                  </div>
                  <div className="mt-2 text-[12px] text-[var(--ink-soft)]">最近 7 天有改动的内容</div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.62)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="px-label">最近编辑</div>
                  <button onClick={() => navigate('/records')} className="px-btn-secondary">
                    查看记录
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="rounded-[20px] border border-[rgba(49,56,45,0.08)] p-4">
                        <div className="mb-3 h-3 w-1/3 px-shimmer" />
                        <div className="h-2 w-1/4 px-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : contents.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[rgba(49,56,45,0.16)] px-6 py-16 text-center">
                    <FileText size={18} className="mx-auto mb-4 text-[var(--accent-deep)]" />
                    <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">还没有稿件</p>
                    <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">先从“新建稿件”开始，系统会为你生成多平台适配结果。</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contents.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/contents/${item.id}/preview`)}
                        className="w-full rounded-[22px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-['Cormorant_Garamond'] text-[28px] leading-[0.95] tracking-[-0.05em] text-[var(--ink)]">
                              {item.title || '未命名稿件'}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.tags.map((tag, index) => (
                                <span key={index} className="px-tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                          <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                            {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-[rgba(49,56,45,0.12)] bg-[rgba(244,249,243,0.9)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="px-label">平台观察</div>
                  <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">4 个目的地</span>
                </div>
                <div className="space-y-3">
                  {platformNotes.map((platform) => (
                    <div key={platform.key} className="rounded-[20px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.74)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="px-dot" style={{ backgroundColor: platform.color }} />
                        <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]">
                          {platform.name}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">{platform.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="px-card px-paper p-6">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays size={16} className="text-[var(--accent-deep)]" />
                <div className="px-label">灵感提示</div>
              </div>
              <div className="space-y-3">
                {inspirationPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => navigate('/inspiration')}
                    className="w-full rounded-[22px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">今日提示</div>
                    <p className="mt-3 text-[14px] leading-7 text-[var(--ink)]">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-card px-paper p-6">
              <div className="px-label mb-4">当前草稿</div>
              {latest ? (
                <div className="rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-5">
                  <div className="font-['Cormorant_Garamond'] text-[34px] leading-[0.95] tracking-[-0.05em] text-[var(--ink)]">
                    {latest.title}
                  </div>
                  <p className="mt-4 text-[13px] leading-6 text-[var(--ink-soft)]">
                    从这里继续修改、预览或重新分发到各个平台。
                  </p>
                  <button onClick={() => navigate(`/contents/${latest.id}/preview`)} className="px-btn-primary mt-5 w-full">
                    打开预览
                  </button>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[rgba(49,56,45,0.16)] px-5 py-12 text-center text-[13px] leading-6 text-[var(--ink-soft)]">
                  当前还没有可继续的稿件。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
