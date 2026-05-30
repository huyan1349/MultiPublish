import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, PenLine, Sparkles, Zap } from 'lucide-react';
import { api } from '../api/client';

interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
}

const platforms = [
  { key: 'wechat', name: 'WeChat', color: '#07C160', note: 'Longform clarity' },
  { key: 'zhihu', name: 'Zhihu', color: '#0066FF', note: 'Argument-led framing' },
  { key: 'bilibili', name: 'Bilibili', color: '#FB7299', note: 'Tag-first discoverability' },
  { key: 'xiaohongshu', name: 'XHS', color: '#FF2442', note: 'Short-form conversion' },
];

const quickActions = [
  {
    to: '/editor',
    icon: PenLine,
    title: 'Compose',
    desc: 'Start a new article and shape it once for every platform.',
    action: 'Open editor',
  },
  {
    to: '/inspiration',
    icon: Sparkles,
    title: 'Develop',
    desc: 'Generate angles, titles, and tonal directions before drafting.',
    action: 'Use inspiration',
  },
  {
    to: '/records',
    icon: FileText,
    title: 'Review',
    desc: 'Inspect recent publishing attempts and platform responses.',
    action: 'View records',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listContents().then(setContents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="px-card px-paper flex min-h-[620px] flex-col justify-between p-8">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="px-label">Editorial console</div>
                <h1 className="font-['Cormorant_Garamond'] text-[68px] leading-[0.9] tracking-[-0.07em] text-[var(--ink)]">
                  Write once,
                  <br />
                  publish with
                  <br />
                  presence.
                </h1>
                <p className="max-w-[280px] text-[14px] leading-7 text-[var(--ink-soft)]">
                  MultiPublish turns a single draft into platform-native output without flattening the voice of each destination.
                </p>
              </div>

              <div className="grid gap-3">
                <button onClick={() => navigate('/editor')} className="px-btn-primary justify-between">
                  Start a new draft
                  <ArrowRight size={14} />
                </button>
                <button onClick={() => navigate('/inspiration')} className="px-btn-secondary justify-between">
                  Explore inspiration
                  <Sparkles size={14} />
                </button>
              </div>

              <div className="grid gap-3">
                <div className="px-metric">
                  <span className="px-metric-label">Connected platforms</span>
                  <span className="px-metric-value">4</span>
                </div>
                <div className="px-metric">
                  <span className="px-metric-label">Editorial system</span>
                  <span className="text-[15px] leading-7 text-[var(--ink-soft)]">
                    Structured for longform, conversion notes, and real browser-side publishing.
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="px-label">Live channels</div>
              <div className="grid gap-2">
                {platforms.map((platform) => (
                  <div
                    key={platform.key}
                    className="flex items-center justify-between rounded-[20px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.68)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-dot px-pulse-dot" style={{ backgroundColor: platform.color }} />
                      <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">
                        {platform.name}
                      </span>
                    </div>
                    <span className="hidden text-[11px] text-[var(--ink-faint)] sm:inline">{platform.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-card px-paper relative min-h-[620px] overflow-hidden p-8 md:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="px-hero-word absolute left-[4%] top-[10%]">WR</div>
              <div className="px-hero-word absolute bottom-[10%] right-[3%]">TE</div>
              <div className="px-orbit left-[23%] top-[16%] h-[320px] w-[320px]" />
              <div className="px-orbit left-[34%] top-[22%] h-[250px] w-[430px] rotate-[18deg]" />
              <div className="px-orbit px-orbit--bold left-[11%] top-[45%] h-[170px] w-[78%] rotate-[-8deg]" />
              <div className="px-orbit px-orbit--bold left-[38%] top-[15%] h-[330px] w-[110px] rotate-[36deg]" />
              <div className="absolute right-[14%] top-[12%] h-3 w-3 rounded-full bg-[var(--gold)]/70" />
              <div className="absolute left-[16%] top-[30%] h-2 w-2 rounded-full bg-[var(--ink)]" />
              <div className="absolute bottom-[16%] right-[22%] h-2 w-2 rounded-full bg-[var(--accent)]/60" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="px-label mb-4">Publishing atelier</div>
                  <p className="max-w-[360px] font-['Cormorant_Garamond'] text-[36px] leading-[1.02] tracking-[-0.05em] text-[var(--ink)]">
                    An interface for creators who care about tone, format, and the moment before publish.
                  </p>
                </div>
                <div className="rounded-full border border-[rgba(120,104,89,0.16)] px-4 py-2 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  Real DOM publishing
                </div>
              </div>

              <div className="relative mx-auto mt-10 h-[360px] w-full max-w-[660px]">
                <div className="px-stack-card left-[11%] top-[8%] h-[240px] w-[300px] rotate-[-5deg] bg-[#c96f4b] p-6 text-white/90">
                  <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em] text-white/70">Draft no. 05</div>
                  <div className="mt-10 font-['Cormorant_Garamond'] text-[44px] leading-[0.92] tracking-[-0.06em]">Original voice, adapted with control.</div>
                </div>

                <div className="px-stack-card left-[24%] top-[18%] z-10 h-[300px] w-[360px] bg-[#f2b93b] p-8 text-[#201811]">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em]">Publishing packet</span>
                    <span className="rounded-full border border-[#201811]/15 px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em]">Live</span>
                  </div>
                  <div className="font-['Cormorant_Garamond'] text-[58px] leading-[0.82] tracking-[-0.07em]">
                    For every
                    <br />
                    platform.
                  </div>
                  <div className="mt-10 flex items-end justify-between">
                    <div className="space-y-2">
                      <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em]">Four outputs</div>
                      <div className="text-[14px] leading-6 text-[#3f2f22]">Headline, body, tags, and platform-native positioning.</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#201811] text-[#f8e7bb]">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>

                <div className="px-stack-card right-[6%] top-[10%] h-[270px] w-[260px] rotate-[3deg] bg-[rgba(255,252,247,0.9)] p-6">
                  <div className="px-label mb-4">Session</div>
                  <div className="space-y-6 text-[13px] text-[var(--ink-soft)]">
                    <div>
                      <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Workflow</div>
                      <div className="mt-2 font-['Cormorant_Garamond'] text-[30px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                        Draft, preview, publish, trace.
                      </div>
                    </div>
                    <div className="space-y-3">
                      {platforms.map((platform) => (
                        <div key={platform.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="px-dot" style={{ backgroundColor: platform.color }} />
                            <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em]">{platform.name}</span>
                          </div>
                          <span className="text-[11px]">Ready</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                <div className="rounded-[28px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.68)] p-5">
                  <div className="px-label mb-3">Approach</div>
                  <p className="text-[14px] leading-7 text-[var(--ink-soft)]">
                    The web console now behaves like an editorial workspace: generous margins, tactile paper layers, elegant serif hierarchy, and just enough motion to keep the tool alive without turning it into decoration.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/editor')}
                  className="rounded-[28px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.76)] p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="px-label mb-3">Start here</div>
                  <div className="font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                    Open the writing desk.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <div className="px-card px-paper p-7 md:p-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="px-label mb-3">Recent drafts</div>
                <h2 className="font-['Cormorant_Garamond'] text-[44px] leading-none tracking-[-0.06em] text-[var(--ink)]">
                  Current working notes
                </h2>
              </div>
              <button onClick={() => navigate('/records')} className="px-btn-secondary">
                View records
                <ArrowRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-[24px] border border-[rgba(120,104,89,0.1)] bg-[rgba(255,252,247,0.62)] p-5">
                    <div className="mb-3 h-3 w-1/3 px-shimmer" />
                    <div className="h-2 w-1/4 px-shimmer" />
                  </div>
                ))}
              </div>
            ) : contents.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-[rgba(120,104,89,0.18)] bg-[rgba(255,252,247,0.55)] px-8 py-16 text-center">
                <Zap size={18} className="mx-auto mb-5 text-[var(--accent)] px-float" strokeWidth={1.5} />
                <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">No drafts yet</p>
                <p className="mx-auto mt-3 max-w-[280px] text-[14px] leading-7 text-[var(--ink-soft)]">
                  Open the editor and start your first cross-platform manuscript.
                </p>
                <button onClick={() => navigate('/editor')} className="px-btn-primary mt-6">
                  Write first draft
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {contents.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/contents/${item.id}/preview`)}
                    className="px-card px-paper px-fade-in flex w-full items-start justify-between gap-4 p-5 text-left"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="px-dot bg-[var(--accent)]" />
                        <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                          Draft archive
                        </span>
                      </div>
                      <p className="font-['Cormorant_Garamond'] text-[34px] leading-[0.95] tracking-[-0.05em] text-[var(--ink)]">
                        {item.title || 'Untitled draft'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags.map((tag, i) => (
                          <span key={i} className="px-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 self-end text-[var(--ink-faint)]">
                      <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em]">
                        {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                      <ArrowRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <div className="px-card px-soft-panel p-7">
              <div className="px-label mb-3">Quick actions</div>
              <div className="space-y-3">
                {quickActions.map((card) => (
                  <button
                    key={card.to}
                    onClick={() => navigate(card.to)}
                    className="rounded-[26px] border border-[rgba(120,104,89,0.12)] bg-[rgba(255,252,247,0.72)] p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <card.icon size={16} className="text-[var(--accent-deep)]" strokeWidth={1.6} />
                        <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                          {card.title}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-[var(--ink-faint)]" />
                    </div>
                    <p className="font-['Cormorant_Garamond'] text-[32px] leading-[0.95] tracking-[-0.05em] text-[var(--ink)]">
                      {card.action}
                    </p>
                    <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-card px-paper p-7">
              <div className="px-label mb-4">System notes</div>
              <div className="space-y-4 text-[14px] leading-7 text-[var(--ink-soft)]">
                <p>
                  The extension remains the real publishing layer. The web console is the place to shape tone, inspect constraints, and route every version before launch.
                </p>
                <p>
                  Current redesign keeps the working logic intact while pulling the interface closer to a premium editorial desk: warmer paper, sharper hierarchy, and layered focal surfaces inspired by your references.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
