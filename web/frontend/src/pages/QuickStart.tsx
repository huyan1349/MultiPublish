import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandMark from '../components/brand/BrandMark';

const floatingShapes = [
  { size: 120, x: '5%', y: '10%', delay: 0, duration: 18 },
  { size: 80, x: '82%', y: '8%', delay: 1.2, duration: 22 },
  { size: 160, x: '92%', y: '60%', delay: 0.6, duration: 20 },
  { size: 100, x: '3%', y: '72%', delay: 1.8, duration: 24 },
  { size: 60, x: '48%', y: '85%', delay: 0.3, duration: 19 },
];

const pulseRings = [
  { scale: 0.92, delay: 0, size: 320 },
  { scale: 0.84, delay: 0.4, size: 320 },
  { scale: 0.72, delay: 0.8, size: 320 },
];

const letterAnim = {
  initial: { opacity: 0, y: 24, rotateX: -40 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
};

const letterTransition = (i: number) => ({
  duration: 0.6,
  delay: 0.3 + i * 0.04,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
});

const title = '从灵感开始';

export default function QuickStart() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--paper-bg)]">
      {/* Ambient floating blobs */}
      {floatingShapes.map((s, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full bg-[var(--accent)]"
          style={{ width: s.size, height: s.size, left: s.x, top: s.y }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.02, 0.05, 0.02],
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Center composition */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Pulsing rings around icon */}
        <motion.div
          className="relative mb-10 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {pulseRings.map((ring, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-[var(--accent)]/15"
              style={{ width: ring.size, height: ring.size }}
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.35, 0], scale: [1, ring.scale, ring.scale] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                delay: ring.delay + 1.2,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Core icon */}
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 shadow-[0_24px_60px_rgba(111,132,109,0.12)]"
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              animate={{ rotate: [0, 8, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={44} className="text-[var(--accent-deep)]" strokeWidth={1.2} />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Title — per-letter animation */}
        <h1 className="font-['Cormorant_Garamond'] text-[64px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
          {title.split('').map((char, i) => (
            <motion.span key={i} className="inline-block" {...letterAnim} transition={letterTransition(i)}>
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          className="mt-5 max-w-[440px] text-[15px] leading-7 text-[var(--ink-soft)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          用一句话描述你想写的话题，AI 自动生成标题、提纲和标签，然后适配到各个平台。
        </motion.p>

        {/* CTA */}
        <motion.div
          className="mt-9"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.3 }}
        >
          <motion.button
            onClick={() => navigate('/inspiration')}
            className="inline-flex items-center gap-2.5 rounded-[18px] bg-[var(--ink)] px-7 py-3.5 text-[14px] text-white shadow-[0_16px_36px_rgba(40,46,38,0.18)] hover:shadow-[0_20px_44px_rgba(40,46,38,0.24)] transition-shadow duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            进入灵感界面
            <ArrowRight size={15} />
          </motion.button>
        </motion.div>

        {/* Bottom hint */}
        <motion.div
          className="mt-16 flex items-center gap-2 text-[12px] text-[var(--ink-faint)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.6 }}
        >
          <BrandMark size={18} rounded={6} />
          <span>按步骤引导你完成第一次发布</span>
        </motion.div>
      </div>
    </div>
  );
}
