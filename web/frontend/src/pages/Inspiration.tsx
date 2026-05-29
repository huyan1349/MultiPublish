import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, Wand2 } from 'lucide-react';
import { generateInspiration } from '../services/deepseek';
import { useContentStore } from '../stores/contentStore';

interface InspirationResult {
  title: string;
  outline: string;
  tags: string[];
  style: string;
}

export default function Inspiration() {
  const navigate = useNavigate();
  const { setDraft } = useContentStore();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspirationResult | null>(null);
  const [history, setHistory] = useState<InspirationResult[]>([]);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateInspiration(topic || undefined);
      setResult(res);
      setHistory(prev => [res, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }, [topic]);

  const handleUseThis = useCallback((item: InspirationResult) => {
    const outlineHtml = item.outline
      .split('\n')
      .filter(Boolean)
      .map(line => `<p>${line}</p>`)
      .join('');
    setDraft({
      title: item.title,
      htmlContent: `<h2>${item.title}</h2>${outlineHtml}`,
      tags: item.tags.join(', '),
      coverImage: '',
    });
    navigate('/editor');
  }, [setDraft, navigate]);

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
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="输入话题（留空随机生成）…"
              className="px-input flex-1"
            />
            <button
              onClick={handleGenerate}
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
          {error && (
            <p className="font-mono text-[10px] text-dot-red mt-3 px-fade-in">{error}</p>
          )}
        </div>

        {loading && !result && (
          <div className="px-card border-dashed border-px-border p-16 text-center">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] text-tx-mute">
              <RefreshCw size={14} className="animate-spin" />
              <span>AI 正在思考</span>
              <span className="px-blink">▌</span>
            </div>
          </div>
        )}

        {result && (
          <div className="px-card p-6 mb-10 px-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Wand2 size={14} className="text-dot-red" />
                <span className="font-mono font-bold text-[11px] text-tx tracking-wide">RESULT</span>
              </div>
              <span className="px-tag">{result.style}</span>
            </div>

            <h2 className="font-mono font-bold text-lg text-tx mb-4">{result.title}</h2>

            <div className="mb-5">
              <span className="px-label">OUTLINE</span>
              <div className="mt-3 space-y-2">
                {result.outline.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-3 font-mono text-xs text-tx-dim">
                    <span className="text-tx-faint mt-px min-w-[18px] text-right">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {result.tags.map((tag, i) => (
                <span key={i} className="px-tag">{tag}</span>
              ))}
            </div>

            <button onClick={() => handleUseThis(result)} className="px-btn-primary">
              <ArrowRight size={13} /> USE THIS
            </button>
          </div>
        )}

        {history.length > 1 && (
          <div>
            <div className="px-label mb-5">HISTORY</div>
            <div className="space-y-1">
              {history.slice(1).map((item, i) => (
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
