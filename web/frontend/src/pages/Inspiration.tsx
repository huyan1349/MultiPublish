import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RefreshCw, Sparkles, Wand2, ChevronDown, ChevronUp, Check, Clock, Users, Lightbulb, Target, SkipForward, Zap, Globe, FileText, GraduationCap, Play, Heart } from 'lucide-react';
import { generateInspiration } from '../services/deepseek';
import { useContentStore } from '../stores/contentStore';
import type { InspirationAngle, InspirationResult } from '../services/deepseek';
import type { PlatformStyle } from '../services/deepseek';

const HISTORY_KEY = 'multipush_inspiration_history';

const TOPIC_BUBBLES = [
  { text: 'AI 与创作', x: '15%', y: '22%', anim: 'px-bubble-1', size: 'lg' },
  { text: '远程办公', x: '78%', y: '18%', anim: 'px-bubble-2', size: 'md' },
  { text: '职场成长', x: '22%', y: '75%', anim: 'px-bubble-3', size: 'md' },
  { text: '科技趋势', x: '82%', y: '70%', anim: 'px-bubble-1', size: 'sm' },
  { text: '个人品牌', x: '50%', y: '12%', anim: 'px-bubble-2', size: 'sm' },
  { text: '内容创作', x: '8%', y: '50%', anim: 'px-bubble-3', size: 'lg' },
  { text: '效率工具', x: '90%', y: '45%', anim: 'px-bubble-1', size: 'md' },
  { text: '生活方式', x: '42%', y: '82%', anim: 'px-bubble-2', size: 'sm' },
];

const PLACEHOLDERS = [
  '输入你想写的话题，比如「AI 如何改变教育」...',
  '试试描述你的专业领域，如「前端开发趋势」...',
  '一个吸引人的话题，像「30岁转行的真实经历」...',
  '描述你最近想分享的观点或故事...',
];

const PLATFORM_OPTIONS: { key: PlatformStyle | ''; label: string; Icon: React.ElementType }[] = [
  { key: '', label: '不限平台', Icon: Globe },
  { key: 'wechat', label: '公众号', Icon: FileText },
  { key: 'zhihu', label: '知乎', Icon: GraduationCap },
  { key: 'bilibili', label: 'B站', Icon: Play },
  { key: 'xiaohongshu', label: '小红书', Icon: Heart },
];

const ANGLE_COLORS: Record<string, string> = {
  '深度分析': '#6d8aa6',
  '教程攻略': '#6f846d',
  '观点评论': '#8b7aa6',
  '故事叙事': '#b8946e',
  '清单推荐': '#6ba694',
  '趋势解读': '#a67a6d',
};

const PLATFORM_BG: Record<string, string> = {
  '公众号': 'var(--platform-wechat-soft)',
  '知乎': 'var(--platform-zhihu-soft)',
  'B站': 'var(--platform-bilibili-soft)',
  '小红书': 'var(--platform-xiaohongshu-soft)',
};

function loadHistory(): InspirationResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items: InspirationResult[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {}
}

function OutlineTypewriter({ outline, skip }: { outline: string; skip: boolean }) {
  const lines = useMemo(() => outline.split('\n').filter(Boolean), [outline]);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (skip) { setVisible(lines.length); return; }
    setVisible(0);
    const timer = setInterval(() => {
      setVisible((prev) => {
        if (prev >= lines.length) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 120);
    return () => clearInterval(timer);
  }, [outline, skip, lines.length]);

  return (
    <div className="space-y-2">
      {lines.slice(0, visible).map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-3 text-[13px] leading-7 text-[var(--ink-soft)]"
        >
          <span className="mt-1.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 font-['IBM_Plex_Mono'] text-[9px] text-[var(--accent-deep)]">
            {i + 1}
          </span>
          <span>{line}</span>
        </motion.div>
      ))}
    </div>
  );
}

function AngleCard({
  angle,
  index,
  onUse,
}: {
  angle: InspirationAngle;
  index: number;
  onUse: (angle: InspirationAngle) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [skipTypewriter, setSkipTypewriter] = useState(false);

  const color = ANGLE_COLORS[angle.angle] || '#6b7280';
  const platformBg = PLATFORM_BG[angle.platformSuggestion] || 'rgba(244,249,243,0.8)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.78)] transition-shadow duration-300 hover:shadow-[0_18px_48px_rgba(41,48,39,0.1)]"
    >
      {/* top accent bar */}
      <div className="h-[3px]" style={{ backgroundColor: color }} />

      <div className="flex flex-1 flex-col p-6">
        {/* angle badge */}
        <div className="mb-4 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.14em]"
            style={{ backgroundColor: `${color}14`, color }}
          >
            {angle.angle}
          </span>
          {angle.platformSuggestion && (
            <span
              className="rounded-full px-2.5 py-1 font-['IBM_Plex_Mono'] text-[9px] tracking-[0.12em]"
              style={{ backgroundColor: platformBg, color: 'var(--ink-soft)' }}
            >
              {angle.platformSuggestion}
            </span>
          )}
        </div>

        {/* title */}
        <h3 className="font-['Cormorant_Garamond'] text-[30px] leading-[0.94] tracking-[-0.04em] text-[var(--ink)]">
          {angle.title}
        </h3>

        {/* hook */}
        <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)] italic">
          「{angle.hook}」
        </p>

        {/* meta chips */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
            <Target size={11} />
            <span>{angle.keyMessage}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
            <Users size={11} />
            <span>{angle.targetAudience}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
            <Clock size={11} />
            <span>{angle.estimatedReadTime}</span>
          </div>
        </div>

        {/* expandable outline */}
        <div className="mt-4">
          <button
            onClick={() => { setExpanded(!expanded); setSkipTypewriter(false); }}
            className="flex w-full items-center justify-between rounded-[20px] border border-[rgba(49,56,45,0.1)] bg-[rgba(244,249,243,0.6)] px-4 py-3 text-left transition-colors hover:bg-[rgba(244,249,243,0.9)]"
          >
            <div className="flex items-center gap-2">
              <Lightbulb size={13} className="text-[var(--accent-deep)]" />
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]">
                内容大纲
              </span>
              {!expanded && (
                <span className="text-[11px] text-[var(--ink-faint)]">点击展开</span>
              )}
            </div>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={13} className="text-[var(--ink-faint)]" />
            </motion.div>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-[20px] border border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.6)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                      大纲预览
                    </span>
                    <button
                      onClick={() => setSkipTypewriter(!skipTypewriter)}
                      className="flex items-center gap-1 rounded-full border border-[rgba(49,56,45,0.1)] px-2 py-0.5 font-['IBM_Plex_Mono'] text-[9px] text-[var(--ink-faint)] transition-colors hover:border-[var(--accent)]/30 hover:text-[var(--accent-deep)]"
                    >
                      <SkipForward size={9} />
                      {skipTypewriter ? '动画已跳过' : '跳过动画'}
                    </button>
                  </div>
                  <OutlineTypewriter outline={angle.outline} skip={skipTypewriter} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {angle.tags.map((tag, i) => (
            <span key={i} className="px-tag">{tag}</span>
          ))}
        </div>

        {/* actions */}
        <div className="mt-auto pt-4">
          <button
            onClick={() => onUse(angle)}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[rgba(49,56,45,0.12)] bg-[var(--ink)] py-3 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.14em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(41,48,39,0.18)]"
          >
            <Zap size={12} />
            应用到编辑台
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingState() {
  const messages = ['分析话题趋势...', '构思内容角度...', '打磨标题表达...', '组织大纲结构...', '筛选精准标签...'];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="h-20 w-20 rounded-full border-2 border-[var(--accent)]/15"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]/40"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={22} className="text-[var(--accent-deep)]" />
        </div>
      </div>

      <motion.p
        key={msgIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="font-['Cormorant_Garamond'] text-[22px] tracking-[-0.03em] text-[var(--ink-soft)]"
      >
        {messages[msgIndex]}
      </motion.p>

      <div className="mt-6 flex items-center gap-2">
        <span className="px-thinking-dot" style={{ animationDelay: '0s' }} />
        <span className="px-thinking-dot" style={{ animationDelay: '0.2s' }} />
        <span className="px-thinking-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </motion.div>
  );
}

export default function Inspiration() {
  const navigate = useNavigate();
  const { setDraft } = useContentStore();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<PlatformStyle | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspirationResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<InspirationResult[]>(loadHistory);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // rotating placeholder
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleGenerate = useCallback(async (overrideTopic?: string) => {
    const nextTopic = overrideTopic ?? topic;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await generateInspiration(
        nextTopic || undefined,
        platform || undefined,
      );
      if (response.angles.length === 0) {
        setError('未能生成灵感，请换个话题试试');
      } else {
        setResult(response);
        const nextHistory = [response, ...history.filter((h) => h.topic !== response.topic)];
        setHistory(nextHistory);
        saveHistory(nextHistory);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [topic, platform, history]);

  const handleUseThis = useCallback((angle: InspirationAngle) => {
    const outlineHtml = angle.outline
      .split('\n')
      .filter(Boolean)
      .map((line) => `<p>${line}</p>`)
      .join('');
    setDraft({
      title: angle.title,
      htmlContent: `<h2>${angle.title}</h2><blockquote><p>${angle.hook}</p></blockquote>${outlineHtml}`,
      tags: angle.tags.join(', '),
      coverImage: '',
    });
    navigate('/editor');
  }, [navigate, setDraft]);

  const hasInput = topic.trim().length > 0;

  return (
    <div className="relative h-full overflow-y-auto scrollbar-thin">
      {/* background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="px-orb h-[420px] w-[420px] animate-[px-orb-1_16s_ease-in-out_infinite]" style={{ left: '-8%', top: '10%', background: 'radial-gradient(circle, rgba(91,108,240,0.18), transparent 70%)' }} />
        <div className="px-orb h-[340px] w-[340px] animate-[px-orb-2_12s_ease-in-out_infinite]" style={{ right: '-5%', top: '40%', background: 'radial-gradient(circle, rgba(111,132,109,0.14), transparent 70%)' }} />
        <div className="px-orb h-[280px] w-[280px] animate-[px-orb-3_14s_ease-in-out_infinite]" style={{ left: '40%', bottom: '15%', background: 'radial-gradient(circle, rgba(139,122,166,0.12), transparent 70%)' }} />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pb-16">
        {/* hero */}
        <section className="relative pt-10 md:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/6 px-4 py-2">
              <Sparkles size={13} className="text-[var(--accent-deep)]" />
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--accent-deep)]">
                AI 创意引擎
              </span>
            </div>

            <h1 className="font-['Cormorant_Garamond'] text-[56px] leading-[0.9] tracking-[-0.07em] text-[var(--ink)]">
              灵感面板
            </h1>
            <p className="mx-auto mt-4 max-w-[480px] text-[14px] leading-7 text-[var(--ink-soft)]">
              输入一个话题，AI 从多个角度为你生成标题、钩子、大纲和标签。选一个最合适的，直接开始写作。
            </p>
          </motion.div>

          {/* input area */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto mt-10 max-w-[640px]"
          >
            {/* floating topic bubbles */}
            {!hasInput && !loading && (
              <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
                {TOPIC_BUBBLES.map((bubble, i) => (
                  <button
                    key={i}
                    onClick={() => { setTopic(bubble.text); inputRef.current?.focus(); }}
                    className={`pointer-events-auto absolute rounded-full border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.82)] px-4 py-2 font-['IBM_Plex_Mono'] text-[11px] tracking-[0.1em] text-[var(--ink-soft)] shadow-[0_4px_16px_rgba(41,48,39,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/6 hover:text-[var(--accent-deep)] hover:shadow-[0_8px_24px_rgba(91,108,240,0.1)]`}
                    style={{
                      left: bubble.x,
                      top: bubble.y,
                      animation: `${bubble.anim} ${5 + i * 1.5}s ease-in-out infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  >
                    {bubble.text}
                  </button>
                ))}
              </div>
            )}

            <div className="relative rounded-[28px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.82)] p-2 shadow-[0_8px_32px_rgba(41,48,39,0.06)] backdrop-blur-md transition-all duration-300 focus-within:border-[var(--accent)]/30 focus-within:shadow-[0_12px_40px_rgba(91,108,240,0.1)]">
              <textarea
                ref={inputRef}
                value={topic}
                onChange={(e) => { setTopic(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); handleGenerate(); } }}
                placeholder={PLACEHOLDERS[placeholderIndex]}
                rows={2}
                className="w-full resize-none border-0 bg-transparent px-4 py-3 text-center text-[16px] leading-7 text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3 px-3 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setPlatform(opt.key)}
                      className={`rounded-full px-3 py-1.5 font-['IBM_Plex_Mono'] text-[10px] tracking-[0.12em] transition-all duration-200 ${
                        platform === opt.key
                          ? 'bg-[var(--accent)]/10 text-[var(--accent-deep)] ring-1 ring-[var(--accent)]/25'
                          : 'text-[var(--ink-faint)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--ink-soft)]'
                      }`}
                    >
                      <opt.Icon size={12} /> {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="flex shrink-0 items-center gap-2 rounded-[18px] bg-[var(--ink)] px-5 py-2.5 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.12em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(41,48,39,0.2)] disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  生成灵感
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* states: loading / error / results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-card px-paper rounded-[32px] p-8"
            >
              <ThinkingState />
            </motion.section>
          )}

          {error && !loading && (
            <motion.section
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-[480px] rounded-[28px] border border-red-300/40 bg-red-100/60 px-8 py-12 text-center"
            >
              <p className="text-[14px] leading-7 text-red-700">{error}</p>
              <button onClick={() => handleGenerate()} className="px-btn-secondary mt-4">重试</button>
            </motion.section>
          )}

          {result && !loading && (
            <motion.section
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                  生成结果
                </p>
                <h2 className="mt-2 font-['Cormorant_Garamond'] text-[36px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                  为「{result.topic}」找到 <span className="px-text-shimmer">{result.angles.length} 个角度</span>
                </h2>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-3">
                {result.angles.map((angle, i) => (
                  <AngleCard
                    key={i}
                    angle={angle}
                    index={i}
                    onUse={handleUseThis}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* empty state — only when no results and not loading */}
        {!result && !loading && !error && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-[28px] border border-dashed border-[rgba(49,56,45,0.16)] px-8 py-16 text-center"
          >
            <Wand2 size={22} className="mx-auto mb-4 text-[var(--accent-deep)]" />
            <p className="font-['Cormorant_Garamond'] text-[24px] tracking-[-0.04em] text-[var(--ink)]">
              输入话题开始探索
            </p>
            <p className="mx-auto mt-3 max-w-[400px] text-[13px] leading-6 text-[var(--ink-soft)]">
              AI 会从深度分析、教程攻略、观点评论等多个角度为你生成内容灵感。每个角度都包含标题、开篇钩子和完整大纲。
            </p>
          </motion.section>
        )}

        {/* history */}
        {history.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="px-card px-paper rounded-[32px] p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="px-label mb-1">历史记录</div>
                <p className="text-[12px] text-[var(--ink-faint)]">最近 {history.length} 次灵感，点击可重新查看</p>
              </div>
              <button
                onClick={() => { setHistory([]); saveHistory([]); }}
                className="px-btn-ghost text-[11px]"
              >
                清空
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {history.map((item, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                  onClick={() => { setResult(item); setTopic(item.topic); }}
                  className={`shrink-0 rounded-[22px] border px-5 py-4 text-left transition-all duration-200 ${
                    result?.topic === item.topic
                      ? 'border-[var(--accent)]/30 bg-[var(--accent)]/6 shadow-[0_6px_20px_rgba(91,108,240,0.08)]'
                      : 'border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.9)]'
                  }`}
                >
                  <div className="whitespace-nowrap font-['Cormorant_Garamond'] text-[22px] leading-none tracking-[-0.04em] text-[var(--ink)]">
                    {item.topic}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--ink-faint)]">
                    {item.angles.length} 个角度
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
