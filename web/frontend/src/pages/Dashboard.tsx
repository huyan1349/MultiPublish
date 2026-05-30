import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, PenLine, Sparkles, Zap } from 'lucide-react';
import { api } from '../api/client';
import BrandMark from '../components/brand/BrandMark';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

const PLATFORM_COLOR: Record<string, string> = {
  wechat: 'var(--platform-wechat)',
  zhihu: 'var(--platform-zhihu)',
  bilibili: 'var(--platform-bilibili)',
  xiaohongshu: 'var(--platform-xiaohongshu)',
};

const platformNotes = [
  { key: 'wechat', name: '公众号', note: '长文排版与正式表达' },
  { key: 'zhihu', name: '知乎', note: '观点结构与逻辑推进' },
  { key: 'bilibili', name: 'B站', note: '标签与导语节奏' },
  { key: 'xiaohongshu', name: '小红书', note: '标题吸引与短段落表达' },
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
  const [backendError, setBackendError] = useState(false);
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null);

  useEffect(() => {
    api.listContents()
      .then((data) => { setContents(data); setBackendError(false); })
      .catch(() => setBackendError(true))
      .finally(() => setLoading(false));
  }, []);

  const retryLoad = () => {
    setLoading(true);
    setBackendError(false);
    api.listContents()
      .then((data) => { setContents(data); setBackendError(false); })
      .catch(() => setBackendError(true))
      .finally(() => setLoading(false));
  };

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

        <section className="relative px-card px-paper overflow-hidden p-8 md:p-10">
          <div className="pointer-events-none absolute right-8 top-8 opacity-[0.04] select-none md:right-12 md:top-10">
            <BrandMark size={220} rounded={60} />
          </div>

          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-[620px]">
                <div className="mb-4 flex items-center gap-3">
                  <BrandMark size={40} rounded={14} />
                  <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                    MultiPublish
                  </span>
                </div>
                <h1 className="font-['Cormorant_Garamond'] text-[52px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                  一次写作，多端真实分发
                </h1>
                <p className="mt-4 text-[14px] leading-7 text-[var(--ink-soft)]">
                  写正文、看平台限制、调用灵感、预览结果、发送到扩展，整条链路在同一个地方完成。
                </p>
              </div>

              <div className="hidden items-center gap-6 xl:flex">
                <div className="text-center">
                  <div className="font-['Cormorant_Garamond'] text-[38px] leading-none tracking-[-0.04em] text-[var(--ink)]">
                    {draftCount}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--ink-soft)]">稿件</div>
                </div>
                <div className="h-8 w-px bg-[rgba(49,56,45,0.1)]" />
                <div className="text-center">
                  <div className="font-['Cormorant_Garamond'] text-[38px] leading-none tracking-[-0.04em] text-[var(--ink)]">
                    {thisWeekCount}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--ink-soft)]">本周更新</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => navigate('/editor')}
                className="group relative overflow-hidden rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[var(--ink)] p-6 text-left text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(41,48,39,0.18)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <PenLine size={16} />
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
                <div className="font-['Cormorant_Garamond'] text-[30px] leading-none tracking-[-0.05em]">
                  新建稿件
                </div>
                <p className="mt-3 text-[12px] leading-5 text-white/60">进入编辑台，开始写作与平台适配</p>
              </button>

              <button
                onClick={() => navigate('/inspiration')}
                className="group relative overflow-hidden rounded-[24px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.7)] p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(41,48,39,0.08)]"
              >
                <div className="mb-4 flex items-center justify-between text-[var(--accent-deep)]">
                  <Sparkles size={16} />
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
                <div className="font-['Cormorant_Garamond'] text-[30px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  灵感面板
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[var(--ink-soft)]">生成标题、角度和大纲</p>
              </button>

              <button
                onClick={() => navigate('/quickstart')}
                className="group relative overflow-hidden rounded-[24px] border-2 border-[var(--accent)]/30 bg-[var(--accent)]/8 p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/12 hover:shadow-[0_12px_32px_rgba(91,108,240,0.12)]"
              >
                <div className="mb-4 flex items-center justify-between text-[var(--accent-deep)]">
                  <Zap size={16} />
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
                <div className="font-['Cormorant_Garamond'] text-[30px] leading-none tracking-[-0.05em] text-[var(--accent-deep)]">
                  快速开始
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[var(--accent-deep)]/70">一句话灵感 → AI提纲 → 编辑 → 发布</p>
              </button>
            </div>

            <div className="relative">
              <div className="absolute -top-2 left-0 right-0 z-10 flex items-center gap-2 px-1">
                <Sparkles size={11} className="text-[var(--accent-deep)]" />
                <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">灵感提示</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 pt-4 scrollbar-thin">
                {inspirationPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => navigate('/inspiration')}
                    onMouseEnter={() => setHoveredPrompt(prompt)}
                    onMouseLeave={() => setHoveredPrompt(null)}
                    className={`shrink-0 rounded-[18px] border px-4 py-3 text-left text-[13px] leading-6 transition-all duration-200 ${
                      hoveredPrompt === prompt
                        ? 'border-[var(--accent)]/30 bg-[var(--accent)]/8 text-[var(--ink)] shadow-[0_6px_18px_rgba(91,108,240,0.1)]'
                        : 'border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.55)] text-[var(--ink-soft)] hover:bg-[rgba(255,255,255,0.75)]'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="px-card px-paper p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="px-label">最近编辑</div>
              <button onClick={() => navigate('/contents')} className="px-btn-secondary">
                管理稿件
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
            ) : backendError ? (
              <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-16 text-center">
                <FileText size={18} className="mx-auto mb-4 text-[var(--accent-deep)]" />
                <p className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.18em] text-[var(--ink-faint)]">后端未连接</p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">请启动后端服务以查看最近编辑。草稿已保存到浏览器本地。</p>
                <button onClick={retryLoad} className="px-btn-secondary mt-4">重试</button>
              </div>
            ) : contents.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[rgba(49,56,45,0.16)] px-6 py-16 text-center">
                <FileText size={18} className="mx-auto mb-4 text-[var(--accent-deep)]" />
                <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">还没有稿件</p>
                <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">从「新建稿件」或「快速开始」开始创作</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contents.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/contents/${item.id}/preview`)}
                    className="group w-full rounded-[22px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(41,48,39,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-['Cormorant_Garamond'] text-[26px] leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
                          {item.title || '未命名稿件'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="px-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-faint)]">
                          {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                        <ArrowRight size={12} className="text-[var(--ink-faint)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {latest && (
              <div className="mt-4 rounded-[24px] border border-[var(--accent)]/20 bg-[var(--accent)]/6 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-dot px-pulse-dot bg-[var(--accent)]" />
                  <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.18em] text-[var(--accent-deep)]">继续编辑</span>
                </div>
                <div className="font-['Cormorant_Garamond'] text-[28px] leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
                  {latest.title}
                </div>
                <button onClick={() => navigate(`/contents/${latest.id}/preview`)} className="px-btn-primary mt-4 w-full">
                  打开预览
                </button>
              </div>
            )}
          </div>

          <div className="px-card px-soft-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="px-label">平台观察</div>
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">4 个目的地</span>
            </div>
            <div className="space-y-3">
              {platformNotes.map((platform) => (
                <div key={platform.key} className="rounded-[20px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.74)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="px-dot" style={{ backgroundColor: PLATFORM_COLOR[platform.key] }} />
                    <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]">
                      {platform.name}
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">{platform.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
