import { useState, useCallback, useEffect, useRef } from 'react';
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

function useTypewriterReveal(result: InspirationResult | null): {
  revealed: RevealedState | null;
  isRevealing: boolean;
} {
  const [revealed, setRevealed] = useState<RevealedState | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (!result) { setRevealed(null); setIsRevealing(false); return; }
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
    const t = overrideTopic ?? topic;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await generateInspiration(t || undefined);
      setResult(res);
      setHistory((prev) => [res, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }, [topic]);

  const handleTopicChip = useCallback((chip: string) => {
    setTopic(chip);
    handleGenerate(chip);
  }, [handleGenerate]);

  const handleUseThis = useCallback((item: InspirationResult) => {
    const outlineHtml = item.outline.split('\n').filter(Boolean).map((line) => `<p>${line}</p>`).join('');
    setDraft({ title: item.title, htmlContent: `<h2>${item.title}</h2>${outlineHtml}`, tags: item.tags.join(', '), coverImage: '' });
    navigate('/editor');
  }, [setDraft, navigate]);

  const hasResult = result !== null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[780px] mx-auto px-10 py-14">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">INSPIRATION</span>
        </div>
        <h1 className="font-mono font-bold text-[24px] text-tx tracking-tight mb-10">
          灵感<span className="text-dot-red">.</span>创作
        </h1>

        <div className="px-card p-5 mb-8">
          <div className="px-label mb-3">TOPIC</div>
          <div className="flex gap-2.5">
            <input
              type="text"
              name="topic"
              autoComplete="off"
              aria-label="话题"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="输入话题（留空随机生成）…"
              className="px-input flex-1"
            />
            <button onClick={() => handleGenerate()} disabled={loading} className="px-btn-primary">
              {loading ? (
                <><RefreshCw size={12} className="animate-spin" /> GENERATING…</>
              ) : (
                <><Sparkles size={12} /> GENERATE</>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {TOPIC_SUGGESTIONS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleTopicChip(chip)}
                disabled={loading}
                className="px-tag hover:bg-px-hover hover:text-tx cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>

          {error && (
            <p className="font-mono text-[9px] text-dot-red mt-2.5 px-fade-in">{error}</p>
          )}
        </div>

        {loading && !hasResult && (
          <div className="px-card border-dashed border-px-border p-14 text-center">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] text-tx-mute">
              <RefreshCw size={13} className="animate-spin" />
              <span>AI 正在思考</span>
              <span className="px-blink">▌</span>
            </div>
          </div>
        )}

        {!loading && !hasResult && (
          <div className="px-card border-dashed border-px-border p-14 text-center dot-grid">
            <div className="relative z-10">
              <Wand2 size={20} className="mx-auto text-tx-faint mb-4" strokeWidth={1.5} />
              <p className="font-mono text-[11px] text-tx-dim mb-1">输入话题，AI 为你生成创作灵感</p>
              <p className="font-mono text-[9px] text-tx-faint font-light">或点击上方话题标签快速开始</p>
            </div>
          </div>
        )}

        {revealed && (
          <div className="px-card p-5 mb-8 px-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wand2 size={12} className="text-dot-red" />
                <span className="font-mono font-bold text-[10px] text-tx tracking-wide">RESULT</span>
              </div>
              <span className="px-tag">{revealed.style}</span>
            </div>

            <h2 className="font-mono font-bold text-[15px] text-tx mb-3">
              {revealed.title}
              {isRevealing && <span className="px-blink text-dot-red">▌</span>}
            </h2>

            <div className="mb-4">
              <span className="px-label">OUTLINE</span>
              <div className="mt-2 space-y-1.5">
                {revealed.outlineLines.map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5 font-mono text-[11px] text-tx-dim px-slide-in">
                    <span className="text-tx-faint mt-px min-w-[16px] text-right font-light">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </div>
                ))}
                {isRevealing && revealed.outlineLines.length === 0 && (
                  <span className="px-blink text-tx-faint font-mono text-[11px]">▌</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-5">
              {revealed.tags.map((tag, i) => (
                <span key={i} className="px-tag px-scale-in">{tag}</span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleUseThis(result!)} disabled={isRevealing} className="px-btn-primary">
                <ArrowRight size={12} /> USE THIS
              </button>
              <button onClick={() => handleGenerate()} disabled={loading || isRevealing} className="px-btn-secondary">
                <RotateCw size={12} /> REGENERATE
              </button>
            </div>
          </div>
        )}

        {history.length > (hasResult ? 1 : 0) && (
          <div>
            <div className="px-label mb-3">HISTORY</div>
            <div className="space-y-0.5">
              {history.slice(hasResult ? 1 : 0).map((item, i) => (
                <button
                  key={i}
                  onClick={() => setResult(item)}
                  className="w-full px-card p-3 text-left flex items-center justify-between group"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
                    <span className="font-mono text-[10px] text-tx truncate">{item.title}</span>
                    <span className="px-tag">{item.style}</span>
                  </div>
                  <ArrowRight size={9} className="text-tx-faint group-hover:text-tx-dim transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
