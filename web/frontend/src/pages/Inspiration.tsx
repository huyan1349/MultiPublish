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
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!result) {
      setRevealed(null);
      setIsRevealing(false);
      return;
    }

    setIsRevealing(true);
    const outlineLines = result.outline.split('\n').filter(Boolean);

    const steps: Array<{ delay: number; fn: () => void }> = [];
    let accDelay = 0;

    accDelay += 100;
    steps.push({ delay: accDelay, fn: () => setRevealed({ title: result.title, outlineLines: [], tags: [], style: result.style }) });

    accDelay += 200;
    outlineLines.forEach((line, i) => {
      accDelay += 120;
      steps.push({
        delay: accDelay,
        fn: () => setRevealed((prev) => prev ? { ...prev, outlineLines: [...prev.outlineLines, line] } : prev),
      });
    });

    accDelay += 200;
    result.tags.forEach((tag) => {
      accDelay += 80;
      steps.push({
        delay: accDelay,
        fn: () => setRevealed((prev) => prev ? { ...prev, tags: [...prev.tags, tag] } : prev),
      });
    });

    accDelay += 100;
    steps.push({ delay: accDelay, fn: () => setIsRevealing(false) });

    for (const step of steps) {
      setTimeout(step.fn, step.delay);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleTopicChip = useCallback((chip: string) => {
    setTopic(chip);
    handleGenerate(chip);
  }, [handleGenerate]);

  const handleUseThis = useCallback((item: InspirationResult) => {
    const outlineHtml = item.outline
      .split('\n')
      .filter(Boolean)
      .map((line) => `<p>${line}</p>`)
      .join('');
    setDraft({
      title: item.title,
      htmlContent: `<h2>${item.title}</h2>${outlineHtml}`,
      tags: item.tags.join(', '),
      coverImage: '',
    });
    navigate('/editor');
  }, [setDraft, navigate]);

  const hasResult = result !== null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-[860px] mx-auto px-12 py-16">
        <div className="flex items-center gap-3 mb-3">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">INSPIRATION</span>
        </div>
        <h1 className="font-mono font-bold text-[28px] text-tx tracking-tight mb-12">
          灵感<span className="text-dot-red">.</span>创作
        </h1>

        <div className="px-card p-6 mb-10">
          <div className="px-label mb-4">TOPIC</div>
          <div className="flex gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="输入话题（留空随机生成）…"
              className="px-input flex-1"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="px-btn-primary"
            >
              {loading ? (
                <><RefreshCw size={13} className="animate-spin" /> GENERATING</>
              ) : (
                <><Sparkles size={13} /> GENERATE</>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {TOPIC_SUGGESTIONS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleTopicChip(chip)}
                disabled={loading}
                className="px-tag hover:bg-px-hover hover:text-tx transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>

          {error && (
            <p className="font-mono text-[10px] text-dot-red mt-3 px-fade-in">{error}</p>
          )}
        </div>

        {loading && !hasResult && (
          <div className="px-card border-dashed border-px-border p-16 text-center">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] text-tx-mute">
              <RefreshCw size={14} className="animate-spin" />
              <span>AI 正在思考</span>
              <span className="px-blink">▌</span>
            </div>
          </div>
        )}

        {!loading && !hasResult && (
          <div className="px-card border-dashed border-px-border p-16 text-center dot-grid">
            <div className="relative z-10">
              <Wand2 size={24} className="mx-auto text-tx-faint mb-5" strokeWidth={1.5} />
              <p className="font-mono text-[12px] text-tx-dim mb-2">输入话题，AI 为你生成创作灵感</p>
              <p className="font-mono text-[10px] text-tx-faint">或点击上方话题标签快速开始</p>
            </div>
          </div>
        )}

        {revealed && (
          <div className="px-card p-6 mb-10 px-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Wand2 size={14} className="text-dot-red" />
                <span className="font-mono font-bold text-[11px] text-tx tracking-wide">RESULT</span>
              </div>
              <span className="px-tag">{revealed.style}</span>
            </div>

            <h2 className="font-mono font-bold text-lg text-tx mb-4">
              {revealed.title}
              {isRevealing && <span className="px-blink text-dot-red">▌</span>}
            </h2>

            <div className="mb-5">
              <span className="px-label">OUTLINE</span>
              <div className="mt-3 space-y-2">
                {revealed.outlineLines.map((line, i) => (
                  <div key={i} className="flex items-start gap-3 font-mono text-xs text-tx-dim px-slide-in">
                    <span className="text-tx-faint mt-px min-w-[18px] text-right">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </div>
                ))}
                {isRevealing && revealed.outlineLines.length === 0 && (
                  <span className="px-blink text-tx-faint font-mono text-xs">▌</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {revealed.tags.map((tag, i) => (
                <span key={i} className="px-tag px-scale-in">{tag}</span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => handleUseThis(result!)} disabled={isRevealing} className="px-btn-primary">
                <ArrowRight size={13} /> USE THIS
              </button>
              <button onClick={handleRegenerate} disabled={loading || isRevealing} className="px-btn-secondary">
                <RotateCw size={13} /> REGENERATE
              </button>
            </div>
          </div>
        )}

        {history.length > (hasResult ? 1 : 0) && (
          <div>
            <div className="px-label mb-5">HISTORY</div>
            <div className="space-y-1">
              {history.slice(hasResult ? 1 : 0).map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setResult(item); }}
                  className="w-full px-card p-4 text-left flex items-center justify-between group"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
                    <span className="font-mono text-xs text-tx truncate">{item.title}</span>
                    <span className="px-tag">{item.style}</span>
                  </div>
                  <ArrowRight size={10} className="text-tx-faint group-hover:text-tx transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
