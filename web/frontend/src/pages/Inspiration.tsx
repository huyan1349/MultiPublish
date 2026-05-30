import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, Wand2, RotateCw } from 'lucide-react';
import { generateInspiration } from '../services/deepseek';
import { useContentStore } from '../stores/contentStore';

interface InspirationResult {
  title: string;
  outline: string;
  tags: string[];
  style: string;
}

interface RevealedState {
  title: string;
  outlineLines: string[];
  tags: string[];
  style: string;
}

const TOPIC_SUGGESTIONS = ['科技趋势', '职场成长', '生活方式', '创意灵感', '行业洞察'];

function useTypewriterReveal(result: InspirationResult | null) {
  const [revealed, setRevealed] = useState<RevealedState | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (!result) {
      setRevealed(null);
      setIsRevealing(false);
      return;
    }

    setIsRevealing(true);
    const outlineLines = result.outline.split('\n').filter(Boolean);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 80;

    timers.push(setTimeout(() => {
      setRevealed({ title: result.title, outlineLines: [], tags: [], style: result.style });
    }, delay));

    delay += 150;
    outlineLines.forEach((line) => {
      delay += 100;
      timers.push(setTimeout(() => {
        setRevealed((prev) => prev ? { ...prev, outlineLines: [...prev.outlineLines, line] } : prev);
      }, delay));
    });

    delay += 150;
    result.tags.forEach((tag) => {
      delay += 60;
      timers.push(setTimeout(() => {
        setRevealed((prev) => prev ? { ...prev, tags: [...prev.tags, tag] } : prev);
      }, delay));
    });

    timers.push(setTimeout(() => setIsRevealing(false), delay + 80));
    return () => timers.forEach(clearTimeout);
  }, [result]);

  return { revealed, isRevealing };
}

export default function Inspiration() {
  const navigate = useNavigate();
  const { setDraft } = useContentStore();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspirationResult | null>(null);
  const [history, setHistory] = useState<InspirationResult[]>([]);
  const [error, setError] = useState('');
  const { revealed, isRevealing } = useTypewriterReveal(result);

  const handleGenerate = useCallback(async (overrideTopic?: string) => {
    const nextTopic = overrideTopic ?? topic;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await generateInspiration(nextTopic || undefined);
      setResult(response);
      setHistory((prev) => [response, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }, [topic]);

  const handleUseThis = useCallback((item: InspirationResult) => {
    const outlineHtml = item.outline.split('\n').filter(Boolean).map((line) => `<p>${line}</p>`).join('');
    setDraft({
      title: item.title,
      htmlContent: `<h2>${item.title}</h2>${outlineHtml}`,
      tags: item.tags.join(', '),
      coverImage: '',
    });
    navigate('/editor');
  }, [navigate, setDraft]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-6">
        <section className="px-card px-paper p-6 md:p-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
            <div className="flex items-center gap-6">
              <div className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                灵感面板
              </div>
              <div className="hidden h-10 w-px bg-[rgba(49,56,45,0.12)] xl:block" />
              <div className="hidden flex-wrap gap-2 xl:flex">
                <span className="px-tag">标题</span>
                <span className="px-tag">提纲</span>
                <span className="px-tag">标签</span>
              </div>
            </div>

            <div className="rounded-[26px] border border-[rgba(49,56,45,0.12)] bg-[rgba(244,249,243,0.9)] p-5">
              <div className="px-label mb-4">常用主题</div>
              <div className="flex flex-wrap gap-2">
                {TOPIC_SUGGESTIONS.map((chip) => (
                  <button key={chip} onClick={() => { setTopic(chip); handleGenerate(chip); }} className="px-tag">
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="px-card px-paper p-6">
            <div className="mb-5 flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !loading && handleGenerate()}
                placeholder="输入想写的话题，留空会随机生成"
                className="px-input flex-1"
              />
              <button onClick={() => handleGenerate()} disabled={loading} className="px-btn-primary">
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                生成灵感
              </button>
            </div>

            {error && <div className="mb-5 rounded-[20px] border border-red-300/40 bg-red-100/60 px-4 py-3 text-[12px] text-red-700">{error}</div>}

            {loading && !result && (
              <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-16 text-center">
                <div className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
                  <RefreshCw size={14} className="animate-spin" />
                  正在生成灵感
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.18)] px-8 py-16 text-center">
                <Wand2 size={20} className="mx-auto mb-4 text-[var(--accent-deep)]" />
                <p className="text-[14px] leading-7 text-[var(--ink-soft)]">
                  输入一个主题，系统会帮你提出角度、标题和结构建议。
                </p>
              </div>
            )}

            {revealed && (
              <div className="rounded-[30px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.72)] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 size={12} className="text-[var(--accent-deep)]" />
                    <span className="px-label">生成结果</span>
                  </div>
                  <span className="px-tag">{revealed.style}</span>
                </div>

                <h2 className="font-['Cormorant_Garamond'] text-[40px] leading-[0.92] tracking-[-0.06em] text-[var(--ink)]">
                  {revealed.title}
                  {isRevealing && <span className="px-blink text-[var(--accent-deep)]">▌</span>}
                </h2>

                <div className="mt-6">
                  <div className="px-label mb-3">提纲</div>
                  <div className="space-y-2">
                    {revealed.outlineLines.map((line, index) => (
                      <div key={index} className="flex gap-3 text-[13px] leading-7 text-[var(--ink-soft)]">
                        <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-faint)]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {revealed.tags.map((tag, index) => (
                    <span key={index} className="px-tag">{tag}</span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => handleUseThis(result!)} disabled={isRevealing} className="px-btn-primary">
                    <ArrowRight size={13} />
                    应用到编辑台
                  </button>
                  <button onClick={() => handleGenerate()} disabled={loading || isRevealing} className="px-btn-secondary">
                    <RotateCw size={13} />
                    重新生成
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="px-card px-paper p-6">
            <div className="px-label mb-4">历史结果</div>
            <div className="space-y-3">
              {history.length <= (result ? 1 : 0) ? (
                <div className="rounded-[22px] border border-dashed border-[rgba(49,56,45,0.16)] px-5 py-10 text-center text-[13px] leading-6 text-[var(--ink-soft)]">
                  暂时还没有历史记录。
                </div>
              ) : (
                history.slice(result ? 1 : 0).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setResult(item)}
                    className="w-full rounded-[22px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-['Cormorant_Garamond'] text-[28px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                          {item.title}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="px-tag">{item.style}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-[var(--ink-faint)]" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
