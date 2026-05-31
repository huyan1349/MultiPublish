import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Presentation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Slide {
  label: string;
  title: string;
  subtitle: string;
  points: string[];
}

const slides: Slide[] = [
  {
    label: '产品定位',
    title: '一次创作',
    subtitle: '多端真实分发',
    points: [
      'Markdown 统一编写，告别多平台重复排版',
      'AI 自动适配各平台风格与格式规范',
      '浏览器扩展真实操作 DOM，不模拟不造假',
      '覆盖公众号、知乎、B站、小红书、微博五大平台',
    ],
  },
  {
    label: '编辑台 · 大纲',
    title: '输入话题',
    subtitle: 'AI 秒级生成结构化大纲',
    points: [
      '核心话题 + 关键要点，先搭骨架再长血肉',
      '风格偏好可选：口语化、专业严谨、幽默犀利',
      'writer 助手随时头脑风暴，补充视角',
      '大纲确认后进入内容生成，无需手动排版',
    ],
  },
  {
    label: '内容生成 · 格式适配',
    title: '同一份内容',
    subtitle: '五种平台风格自动转换',
    points: [
      '公众号：深度长文、干货分享、情感叙事、热点解读',
      '知乎：专业分析、经验分享、观点评论、科普解读',
      'B站：测评体验、教程攻略、吐槽观点、盘点合集',
      '小红书：种草测评、教程攻略、好物合集、探店体验',
    ],
  },
  {
    label: '核心能力',
    title: '真实发布',
    subtitle: '内容直接注入目标平台编辑器',
    points: [
      'Content Script 注入平台页面，找到编辑器元素',
      '填入标题、正文、标签，触发真实 input 事件',
      '自动点击发布按钮，走完平台完整发布流程',
      '发布结果实时回传，成功/失败状态一目了然',
    ],
  },
  {
    label: '工作流闭环',
    title: '灵感 → 发布',
    subtitle: '每一步都可控、可追溯',
    points: [
      '灵感面板：AI 选题建议，标题与标签自动生成',
      '编辑台：Tiptap 富文本编辑器，所见即所得',
      '平台输出：字数校验、格式预览、一键优化美化',
      '发布记录：全平台发布历史，状态追踪与重试',
    ],
  },
];

const slideVariants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function DemoSlideshow({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);

  const prev = useCallback(() => setIndex((i) => (i === 0 ? slides.length - 1 : i - 1)), []);
  const next = useCallback(() => setIndex((i) => (i === slides.length - 1 ? 0 : i + 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  const slide = slides[index];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Presentation size={15} className="text-[var(--accent-deep)]" />
          <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            演示模式 · DEMO
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-[var(--ink-faint)] tabular-nums">
            {index + 1} / {slides.length}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(49,56,45,0.1)] px-3.5 py-1.5 text-[11px] text-[var(--ink-soft)] hover:bg-[rgba(49,56,45,0.04)] hover:text-[var(--ink)] transition-all"
          >
            <X size={11} />
            退出
          </button>
        </div>
      </div>

      {/* Main slide area */}
      <div className="flex-1 flex items-center px-8 relative overflow-hidden">
        {/* Ambient accent */}
        <div className="absolute top-1/4 -right-12 w-72 h-72 rounded-full bg-[var(--accent)]/3 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Label */}
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(49,56,45,0.1)] bg-[rgba(249,250,248,0.8)] px-4 py-1.5 text-[11px] text-[var(--ink-soft)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  {slide.label}
                </span>
              </div>

              {/* Title */}
              <h2 className="font-['Cormorant_Garamond'] text-[68px] leading-[0.9] tracking-[-0.06em] text-[var(--ink)] mb-4">
                {slide.title}
              </h2>

              {/* Subtitle */}
              <p className="font-['Cormorant_Garamond'] text-[34px] leading-[0.95] tracking-[-0.04em] text-[var(--accent-deep)] mb-10">
                {slide.subtitle}
              </p>

              {/* Divider */}
              <div className="w-16 h-px bg-[rgba(49,56,45,0.15)] mb-8" />

              {/* Points */}
              <ul className="space-y-4">
                {slide.points.map((point, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3 text-[14px] leading-6 text-[var(--ink-soft)]"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                  >
                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40" />
                    {point}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-8 py-5 shrink-0 border-t border-[rgba(49,56,45,0.06)]">
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-5 h-1.5 bg-[var(--accent)]'
                  : 'w-1.5 h-1.5 bg-[rgba(49,56,45,0.15)] hover:bg-[rgba(49,56,45,0.3)]'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(49,56,45,0.1)] text-[var(--ink-soft)] hover:bg-[rgba(49,56,45,0.04)] hover:text-[var(--ink)] transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90 transition-all shadow-[0_4px_12px_rgba(40,46,38,0.15)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
