import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandMark from '../brand/BrandMark';

interface Slide {
  tag: string;
  title: string;
  subtitle: string;
  detail: string;
}

const slides: Slide[] = [
  {
    tag: '产品概述',
    title: 'MultiPublish',
    subtitle: '一次创作，多端真实分发',
    detail: '面向创作者的多平台内容发布工具。Markdown 编写，AI 适配格式，扩展真实注入发布。',
  },
  {
    tag: '编辑台 · 大纲',
    title: 'AI 大纲引擎',
    subtitle: '输入话题，秒级生成结构化大纲',
    detail: '支持关键要点拆解、风格偏好配置、多平台视角建议。先搭骨架，再长血肉。',
  },
  {
    tag: '内容生成',
    title: '格式智能适配',
    subtitle: '同一份内容，适配五种平台风格',
    detail: '公众号深度长文、知乎专业分析、B站教程攻略、小红书种草测评、微博热点速递。每种格式对应平台真实热门模板。',
  },
  {
    tag: '核心能力',
    title: '真实一键发布',
    subtitle: '内容直接注入目标平台编辑器',
    detail: '不模拟、不造假。通过浏览器扩展操作真实 DOM，自动填入标题、正文、标签，点击发布按钮，走完整发布流程。',
  },
  {
    tag: '工作流闭环',
    title: '全链路可追溯',
    subtitle: '从灵感到发布记录，每一步可控',
    detail: '灵感采集 → AI 生成 → 多格式适配 → 平台输出校验 → 一键发布 → 发布状态追踪。',
  },
];

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
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
    <aside className="fixed right-0 top-0 bottom-0 w-[38vw] min-w-[420px] bg-[#121310] text-white flex flex-col z-50 border-l border-white/5 shadow-[-20px_0_60px_rgba(0,0,0,0.3)]">
      {/* Close bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BrandMark size={20} rounded={6} />
          <span className="font-['IBM_Plex_Mono'] text-[9px] tracking-[0.16em] text-white/30">演示模式</span>
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-white/40 hover:bg-white/10 hover:text-white/60 transition">
          <X size={11} />
          退出演示
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col justify-center px-10 relative overflow-hidden">
        {/* Background ambient */}
        <div className="absolute top-1/4 -right-12 w-64 h-64 rounded-full bg-[var(--accent)]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-12 w-48 h-48 rounded-full bg-white/3 blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]/70 mb-8">
              {slide.tag}
            </div>

            <h2 className="font-['Cormorant_Garamond'] text-[56px] leading-[0.92] tracking-[-0.06em] mb-6">
              {slide.title}
            </h2>

            <p className="text-[20px] leading-[1.2] tracking-[-0.02em] text-white/80 mb-6 font-['Cormorant_Garamond']">
              {slide.subtitle}
            </p>

            <p className="text-[14px] leading-7 text-white/45 max-w-[90%]">
              {slide.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with nav */}
      <div className="flex items-center justify-between px-6 py-5 border-t border-white/5">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index ? 'w-5 h-1.5 bg-white/60' : 'w-1.5 h-1.5 bg-white/15 hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/70 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
