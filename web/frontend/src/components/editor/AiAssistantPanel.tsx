import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, RefreshCw, Check, Copy, Wand2, Zap, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeContent, optimizeSelection } from '../../services/deepseek';

interface SuggestionResult {
  type: 'full' | 'selection';
  title?: string;
  htmlBody?: string;
  optimizedText?: string;
  explanation: string;
}

interface AiAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  articleTitle: string;
  articleContent: string;
  getSelectedText: () => string;
  onApplyOptimization: (title: string, htmlBody: string) => void;
  onApplySelectionOptimization: (originalText: string, optimizedText: string) => void;
}

const QUICK_ACTIONS = [
  { id: 'polish', label: '润色全文', desc: '优化语言表达与节奏感', icon: Sparkles },
  { id: 'structure', label: '结构优化', desc: '调整段落间的逻辑递进', icon: Wand2 },
  { id: 'viral', label: '增强传播力', desc: '优化标题与开篇钩子', icon: Zap },
  { id: 'selection', label: '优化选中段落', desc: '在编辑器中选中文字后点击', icon: Copy },
];

const INSTRUCTION_MAP: Record<string, string> = {
  polish: '请润色全文，优化语言表达和节奏感，让文章读起来更流畅自然',
  structure: '请优化文章结构，调整段落间的逻辑递进关系，确保论证清晰有力',
  viral: '请增强文章的传播力，优化标题和开篇钩子，让文章更容易被转发和分享',
};

export default function AiAssistantPanel({
  open,
  onClose,
  articleTitle,
  articleContent,
  getSelectedText,
  onApplyOptimization,
  onApplySelectionOptimization,
}: AiAssistantPanelProps) {
  const [loading, setLoading] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [resultExpanded, setResultExpanded] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setError('');
      setCustomInput('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const runAction = async (actionId: string, customInstruction?: string) => {
    if (loading) return;
    setError('');
    setResult(null);

    if (actionId === 'selection') {
      const selected = getSelectedText();
      if (!selected || selected.trim().length === 0) {
        setError('请先在编辑器中选中一段文字，再点击此操作');
        return;
      }
      setLoading(true);
      try {
        const res = await optimizeSelection(selected, articleContent, customInstruction);
        setResult({ type: 'selection', optimizedText: res.optimizedText, explanation: res.explanation });
      } catch (err) {
        setError(err instanceof Error ? err.message : '请求失败');
      } finally {
        setLoading(false);
      }
      return;
    }

    const instruction = customInstruction || INSTRUCTION_MAP[actionId] || '';
    setLoading(true);
    try {
      const res = await optimizeContent(articleTitle, articleContent, instruction);
      setResult({ type: 'full', title: res.title, htmlBody: res.htmlBody, explanation: res.explanation });
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    const text = customInput.trim();
    if (!text || loading) return;
    runAction('polish', text);
    setCustomInput('');
  };

  const handleApply = () => {
    if (!result) return;
    if (result.type === 'full') {
      if (!result.title && !result.htmlBody) {
        setError('AI 返回结果为空，请重试');
        return;
      }
      onApplyOptimization(result.title || '', result.htmlBody || '');
      setResult(null);
    } else if (result.type === 'selection' && result.optimizedText) {
      const selected = getSelectedText();
      if (selected) {
        onApplySelectionOptimization(selected, result.optimizedText);
        setResult(null);
      } else {
        setError('请重新在编辑器中选中要替换的文字');
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="shrink-0 overflow-hidden border-l border-[rgba(49,56,45,0.08)]"
          style={{ backgroundColor: 'var(--paper-bg)' }}
        >
          <div className="flex h-full w-[400px] flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(49,56,45,0.08)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[12px] bg-[var(--accent)]/10 flex items-center justify-center">
                  <Sparkles size={15} className="text-[var(--accent-deep)]" />
                </div>
                <div>
                  <div className="font-['Cormorant_Garamond'] text-[22px] leading-none tracking-[-0.03em] text-[var(--ink)]">
                    multipush writer
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-faint)] hover:bg-[rgba(0,0,0,0.05)] hover:text-[var(--ink)] transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scrollbar-thin">
              {/* Quick Actions */}
              <div>
                <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">快捷操作</span>
                <div className="mt-2 grid gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => runAction(action.id)}
                      disabled={loading}
                      className="flex items-center gap-3 px-4 py-3 rounded-[18px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.6)] text-left hover:border-[var(--accent)]/25 hover:bg-[var(--accent)]/5 transition-all duration-200 group disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-[12px] bg-[var(--accent)]/8 flex items-center justify-center shrink-0 group-hover:bg-[var(--accent)]/14 transition-colors">
                        <action.icon size={15} className="text-[var(--accent-deep)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[var(--ink)]">{action.label}</div>
                        <div className="text-[11px] text-[var(--ink-soft)] truncate">{action.desc}</div>
                      </div>
                      <ArrowRight size={12} className="text-[var(--ink-faint)] shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[rgba(49,56,45,0.08)]" />
                <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">或自定义</span>
                <div className="h-px flex-1 bg-[rgba(49,56,45,0.08)]" />
              </div>

              {/* Custom input */}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                  placeholder="输入优化指令，如：改成口语化风格…"
                  className="flex-1 px-4 py-2.5 rounded-[14px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.6)] text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/8 transition-all placeholder:text-[var(--ink-faint)]"
                  disabled={loading}
                />
                <button
                  onClick={handleCustomSubmit}
                  disabled={loading || !customInput.trim()}
                  className="w-9 h-9 rounded-[12px] bg-[var(--ink)] text-white flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30"
                >
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-3 px-4 py-4 rounded-[18px] bg-[var(--accent)]/5 border border-[var(--accent)]/12">
                  <RefreshCw size={14} className="animate-spin text-[var(--accent-deep)]" />
                  <span className="text-[13px] text-[var(--accent-deep)]">AI 正在优化，请稍候…</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-[18px] bg-red-50/80 border border-red-200/60">
                  <p className="text-[12px] text-red-600 leading-5">{error}</p>
                </div>
              )}

              {/* Result Card — AI modified indicator */}
              {result && !loading && (
                <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/40 overflow-hidden">
                  <button
                    onClick={() => setResultExpanded(!resultExpanded)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-100/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} className="text-amber-600" />
                      <span className="font-['Cormorant_Garamond'] text-[20px] leading-none tracking-[-0.03em] text-amber-700">
                        AI 优化结果
                      </span>
                      <span className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">
                        AI 修改
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.explanation && (
                        <span className="text-[11px] text-amber-600/70 max-w-[180px] truncate hidden sm:inline italic">
                          {result.explanation}
                        </span>
                      )}
                      {resultExpanded ? <ChevronUp size={13} className="text-amber-500" /> : <ChevronDown size={13} className="text-amber-500" />}
                    </div>
                  </button>

                  {resultExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {result.type === 'full' && result.htmlBody && (
                        <div className="rounded-[18px] border border-amber-200/50 bg-white p-5 max-h-[320px] overflow-y-auto scrollbar-thin">
                          {result.title && (
                            <h3 className="font-['Cormorant_Garamond'] text-[24px] leading-[1.1] tracking-[-0.04em] text-amber-800 mb-3">
                              {result.title}
                            </h3>
                          )}
                          <div
                            className="text-[13px] leading-7 italic text-amber-900/80 [&_strong]:text-amber-950 [&_h3]:not-italic [&_h2]:not-italic [&_h3]:text-[var(--ink)] [&_h2]:text-[var(--ink)]"
                            dangerouslySetInnerHTML={{ __html: result.htmlBody }}
                          />
                        </div>
                      )}

                      {result.type === 'selection' && result.optimizedText && (
                        <div className="rounded-[18px] border border-amber-200/50 bg-white p-5 max-h-[220px] overflow-y-auto scrollbar-thin">
                          <div
                            className="text-[13px] leading-7 italic text-amber-900/80"
                            dangerouslySetInnerHTML={{ __html: result.optimizedText }}
                          />
                        </div>
                      )}

                      <button
                        onClick={handleApply}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[14px] bg-[var(--accent)] text-white text-[13px] font-medium hover:bg-[var(--accent-deep)] transition-colors shadow-[0_4px_16px_rgba(91,108,240,0.2)]"
                      >
                        <Check size={14} />
                        应用到编辑器
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
