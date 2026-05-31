import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ExternalLink, Globe, MessageCircle, Play, ShoppingBag, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandMark from '../components/brand/BrandMark';

const platforms = [
  {
    key: 'wechat',
    name: '公众号',
    url: 'https://mp.weixin.qq.com',
    cssVar: '--platform-wechat',
    color: '#07C160',
    icon: MessageCircle,
  },
  {
    key: 'zhihu',
    name: '知乎',
    url: 'https://zhuanlan.zhihu.com/write',
    cssVar: '--platform-zhihu',
    color: '#0066FF',
    icon: Globe,
  },
  {
    key: 'bilibili',
    name: 'B站',
    url: 'https://member.bilibili.com/platform/upload/video/frame',
    cssVar: '--platform-bilibili',
    color: '#FB7299',
    icon: Play,
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    url: 'https://creator.xiaohongshu.com/publish/publish',
    cssVar: '--platform-xiaohongshu',
    color: '#FF2442',
    icon: ShoppingBag,
  },
  {
    key: 'weibo',
    name: '微博',
    url: 'https://weibo.com',
    cssVar: '--platform-weibo',
    color: '#E6162D',
    icon: Send,
  },
];

const floatingShapes = [
  { size: 120, x: '5%', y: '10%', delay: 0, duration: 18 },
  { size: 80, x: '82%', y: '8%', delay: 1.2, duration: 22 },
  { size: 160, x: '92%', y: '60%', delay: 0.6, duration: 20 },
  { size: 100, x: '3%', y: '72%', delay: 1.8, duration: 24 },
  { size: 60, x: '48%', y: '85%', delay: 0.3, duration: 19 },
];

const pulseRings = [
  { scale: 0.92, delay: 0, size: 280 },
  { scale: 0.82, delay: 0.4, size: 280 },
  { scale: 0.68, delay: 0.8, size: 280 },
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

const cardItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const cardContainer = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 1.8 } },
};

export default function QuickStart() {
  const navigate = useNavigate();

  const handleOpenPlatform = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative overflow-hidden bg-[var(--paper-bg)]">
      {/* Ambient floating blobs */}
      {floatingShapes.map((s, i) => (
        <motion.div
          key={i}
          className="pointer-events-none fixed rounded-full bg-[var(--accent)]"
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

      {/* ── Hero ── */}
      <section className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center px-6">
        {/* Pulse rings */}
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

        {/* Title */}
        <h1 className="text-center font-['Cormorant_Garamond'] text-[64px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
          {title.split('').map((char, i) => (
            <motion.span key={i} className="inline-block" {...letterAnim} transition={letterTransition(i)}>
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-5 max-w-[460px] text-center text-[15px] leading-7 text-[var(--ink-soft)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          用一句话描述你想写的话题，AI 自动生成标题、提纲和标签。
          <br />
          发布前，请确认已在下方平台登录。
        </motion.p>

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

        {/* Scroll hint */}
        <motion.div
          className="mt-20 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2.0 }}
        >
          <span className="text-[11px] text-[var(--ink-faint)] tracking-[0.12em]">向下滚动确认平台登录</span>
          <motion.div
            className="h-8 w-5 rounded-full border border-[rgba(49,56,45,0.12)] flex items-start justify-center pt-1.5"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Platform login check ── */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          className="mx-auto max-w-[680px]"
          initial="initial"
          animate="animate"
          variants={cardContainer}
        >
          <motion.div className="mb-8 text-center" variants={cardItem}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.6)] px-4 py-1.5 text-[11px] text-[var(--ink-soft)]">
              <Globe size={12} />
              发布前确认每个平台已登录
            </div>
          </motion.div>

          <div className="grid gap-3">
            {platforms.map((p) => (
              <motion.div
                key={p.key}
                variants={cardItem}
                className="group flex items-center gap-4 rounded-[20px] border border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4 transition-all duration-300 hover:border-[rgba(49,56,45,0.16)] hover:bg-white hover:shadow-[0_8px_24px_rgba(40,46,38,0.05)]"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
                  style={{ backgroundColor: `${p.color}14` }}
                >
                  <p.icon size={18} style={{ color: p.color }} strokeWidth={1.5} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[var(--ink)]">{p.name}</span>
                    <span className="text-[11px] text-[var(--ink-faint)] font-mono truncate">{p.url}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenPlatform(p.url)}
                  className="flex shrink-0 items-center gap-1.5 rounded-[12px] border border-[rgba(49,56,45,0.1)] bg-white px-3.5 py-2 text-[12px] text-[var(--ink-soft)] hover:border-[rgba(49,56,45,0.2)] hover:text-[var(--ink)] transition-all duration-200"
                >
                  打开确认
                  <ExternalLink size={11} />
                </button>
              </motion.div>
            ))}
          </div>

          {/* After login hint */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.4 }}
          >
            <div className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
              <BrandMark size={16} rounded={5} />
              确认已登录后，回到灵感界面开始创作
            </div>
            <button
              onClick={() => navigate('/inspiration')}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[var(--ink)] px-7 py-3.5 text-[14px] text-white shadow-[0_16px_36px_rgba(40,46,38,0.18)] hover:shadow-[0_20px_44px_rgba(40,46,38,0.24)] transition-shadow duration-300"
            >
              <Sparkles size={15} />
              进入灵感界面
            </button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
