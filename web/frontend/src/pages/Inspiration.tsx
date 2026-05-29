import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, Wand2 } from 'lucide-react';
import { generateInspiration, type BeautifyOptions } from '../services/deepseek';
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
      <div className="max-w-[860px] mx-auto px-10 py-14">
        <div className="flex items-center gap-3 mb-2">
          <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
          <span className="px-label">INSPIRATION</span>
        </div>
        <h1 className="font-mono font-bold text-[24px] text-tx tracking-tight mb-10">
          灵感<span className="text-dot-red">.</span>创作
        </h1>

        <div className="px-card p-5 mb-8">
          <div className="px-label mb-3">TOPIC</div>
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
            <p className="font-mono text-[10px] text-dot-red mt-2 px-fade-in">{error}</p>
          )}
        </div>

        {loading && !result && (
          <div className="px-card border-dashed border-px-border p-12 text-center">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] text-tx-mute">
              <RefreshCw size={14} className="animate-spin" />
              <span>AI 正在思考</span>
              <span className="px-blink">▌</span>
            </div>
          </div>
        )}

        {result && (
          <div className="px-card p-5 mb-8 px-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wand2 size={14} className="text-dot-red" />
                <span className="font-mono font-bold text-[11px] text-tx tracking-wide">RESULT</span>
              </div>
              <span className="font-mono text-[9px] text-tx-faint px-tag">{result.style}</span>
            </div>

            <h2 className="font-mono font-bold text-base text-tx mb-3">{result.title}</h2>

            <div className="mb-4">
              <span className="px-label">OUTLINE</span>
              <div className="mt-2 space-y-1.5">
                {result.outline.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-xs text-tx-dim">
                    <span className="text-tx-faint mt-px">{String(i + 1).padStart(2, '0')}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-5">
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
            <div className="px-label mb-4">HISTORY</div>
            <div className="space-y-px">
              {history.slice(1).map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setResult(item); }}
                  className="w-full px-card p-3.5 text-left flex items-center justify-between group"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="px-dot" style={{ backgroundColor: '#FF3B30' }} />
                    <span className="font-mono text-xs text-tx truncate">{item.title}</span>
                    <span className="px-tag">{item.style}</span>
                  </div>
                  <ArrowRight size={10} className="text-tx-faint group-hover:text-dot-red transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
