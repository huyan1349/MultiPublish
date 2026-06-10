import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Download, Check, AlertCircle, Zap, PenLine,
  Sparkles, Puzzle, Globe, Shield, ChevronDown, ExternalLink,
  Copy, RefreshCw, Maximize,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useExtensionStatus } from '../hooks/useExtensionStatus';
import { getExtensionId, isExtensionInstalled } from '../utils/extensionBridge';
import BrandMark from '../components/brand/BrandMark';

/* ── Types ── */

interface PlatformInfo {
  key: string;
  name: string;
  color: string;
  desc: string;
}

/* ── Constants ── */

const PLATFORMS: PlatformInfo[] = [
  { key: 'wechat', name: '公众号', color: 'var(--platform-wechat)', desc: '深度长文，专业读者群' },
  { key: 'zhihu', name: '知乎', color: 'var(--platform-zhihu)', desc: '问答驱动，观点交锋' },
  { key: 'bilibili', name: 'B站', color: 'var(--platform-bilibili)', desc: '专栏图文，年轻社区' },
  { key: 'xiaohongshu', name: '小红书', color: 'var(--platform-xiaohongshu)', desc: '生活方式，短平快传播' },
  { key: 'weibo', name: '微博', color: 'var(--platform-weibo)', desc: '话题引爆，即时扩散' },
];

const SETUP_STEPS = [
  {
    step: 1,
    title: '安装扩展',
    desc: '从 Chrome 应用商店或本地加载已解压的扩展程序',
    icon: Download,
    action: 'install',
  },
  {
    step: 2,
    title: '建立连接',
    desc: '打开扩展 Side Panel，系统自动完成握手，无需手动配置',
    icon: Puzzle,
    action: 'connect',
  },
  {
    step: 3,
    title: '开始创作',
    desc: '在编辑台写 Markdown，一键适配五平台格式，真实发布',
    icon: PenLine,
    action: 'start',
  },
];

const INSTALL_STEPS = [
  '打开 Chrome 浏览器，地址栏输入 chrome://extensions',
  '打开右上角「开发者模式」开关',
  '点击「加载已解压的扩展程序」',
  '选择项目 build/chrome-mv3-prod 目录',
  '固定扩展图标到工具栏，方便快速打开',
];

/* ── Helpers ── */

function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

/* ── Sub-components ── */

function Section({
  children,
  className = '',
  id,
}: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={`relative mx-auto w-full max-w-[1280px] px-6 py-16 md:px-10 md:py-24 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  overline,
  title,
  subtitle,
  center = false,
}: { overline: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={`mb-12 md:mb-16 ${center ? 'text-center' : ''}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">
          {overline}
        </span>
      </div>
      <h2 className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.06em] text-[var(--ink)] md:text-[58px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-[var(--ink-soft)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function GlowOrb({ color, className, size = 420 }: { color: string; className: string; size?: number }) {
  return (
    <div
      className={`px-orb ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: 0.12,
      }}
    />
  );
}

/* ── Main Component ── */

export default function Welcome() {
  const navigate = useNavigate();

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);
  const extStatus = useExtensionStatus(3000);
  const [copied, setCopied] = useState(false);
  const [installExpanded, setInstallExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const activeStepRef = useRef(1);
  const extId = getExtensionId();

  // Scroll-triggered step progress
  const connectRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const updateActiveStep = () => {
      frame = 0;
      const scrollY = window.scrollY + window.innerHeight / 2;
      const connectEl = connectRef.current;
      const startEl = startRef.current;

      let nextStep = 1;
      if (startEl && scrollY >= startEl.offsetTop) {
        nextStep = 3;
      } else if (connectEl && scrollY >= connectEl.offsetTop) {
        nextStep = 2;
      }

      if (activeStepRef.current !== nextStep) {
        activeStepRef.current = nextStep;
        setActiveStep(nextStep);
      }
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveStep);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleCopyExtId = async () => {
    const id = extId || '';
    if (!id) return;
    const ok = await copyToClipboard(id);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoDashboard = () => navigate('/');

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafcf9]">
      {/* ── Ambient Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <GlowOrb color="var(--accent)" className="absolute -left-24 -top-24" />
        <GlowOrb color="var(--platform-weibo)" className="absolute -right-20 top-1/3" size={300} />
        <GlowOrb color="var(--platform-bilibili)" className="absolute -bottom-32 left-1/3" size={350} />
        {/* grain overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
      </div>

      {/* ── Fullscreen button ── */}
      <button
        onClick={handleFullscreen}
        className="fixed right-4 top-4 z-50 flex items-center gap-1.5 rounded-full border border-[rgba(49,56,45,0.08)] bg-white/60 backdrop-blur-sm px-3 py-1.5 text-[11px] text-[var(--ink-soft)] hover:bg-white hover:border-[rgba(49,56,45,0.15)] transition-all"
        title="全屏"
      >
        <Maximize size={12} />
        全屏
      </button>

      {/* ── Progress indicator (fixed) ── */}
      <div className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex">
        {SETUP_STEPS.map((s) => {
          const isActive = activeStep === s.step;
          const isDone = activeStep > s.step;
          return (
            <div key={s.step} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  isDone
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : isActive
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                      : 'border-[rgba(49,56,45,0.15)] bg-transparent text-[var(--ink-faint)]'
                }`}
              >
                {isDone ? <Check size={13} strokeWidth={2.5} /> : <span className="font-['IBM_Plex_Mono'] text-[10px]">{s.step}</span>}
              </div>
              <span className={`font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] transition-colors duration-500 ${
                isActive || isDone ? 'text-[var(--ink)]' : 'text-[var(--ink-faint)]'
              }`}>
                {s.title}
              </span>
              {s.step < 3 && (
                <div className={`h-8 w-px transition-colors duration-500 ${isDone ? 'bg-[var(--accent)]' : 'bg-[rgba(49,56,45,0.1)]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── HERO SECTION ── */}
      <Section id="hero" className="pt-24 md:pt-36">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Brand */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <BrandMark size={88} rounded={28} />
          </motion.div>

          {/* Badge */}
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/6 px-4 py-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <span className="px-dot bg-[var(--accent)]" />
            <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--accent-deep)]">
              MultiPublish v2.2
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-['Cormorant_Garamond'] text-[56px] leading-[0.9] tracking-[-0.07em] text-[var(--ink)] md:text-[84px] lg:text-[100px]">
            一次创作，
            <br />
            <span className="px-text-shimmer">多端真实分发</span>
          </h1>

          <p className="mt-6 max-w-[540px] text-[16px] leading-8 text-[var(--ink-soft)] md:text-[18px]">
            在编辑台写好 Markdown，自动适配公众号、知乎、B站、小红书、微博五种格式，通过浏览器扩展直接注入各平台编辑器，真实发布，不模拟不造假。
          </p>

          {/* Platform pills */}
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {PLATFORMS.map((p, i) => (
              <span
                key={p.key}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.78)] px-4 py-2 text-[13px] text-[var(--ink)] backdrop-blur-sm"
                style={{ animationDelay: `${0.6 + i * 0.06}s` }}
              >
                <span className="px-dot" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <button onClick={handleGoDashboard} className="px-btn-primary min-w-[180px]">
              进入工作台 <ArrowRight size={14} />
            </button>
            <button
              onClick={() => document.getElementById('setup-install')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-btn-secondary min-w-[180px]"
            >
              查看设置指南 <ChevronDown size={14} />
            </button>
          </motion.div>
        </motion.div>
      </Section>

      {/* ── SETUP GUIDE SECTION ── */}
      <Section id="setup-install">
        <SectionHeading
          overline="01 · 安装扩展"
          title="把 MultiPublish 装到浏览器"
          subtitle="扩展是连接编辑台和各平台之间的桥梁，负责将内容真实注入各平台的编辑器。"
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Install steps */}
          <div className="rounded-[32px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.8)] p-6 backdrop-blur-sm md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <Download size={18} className="text-[var(--accent-deep)]" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--ink)]">Chrome 扩展安装步骤</div>
                <div className="text-[12px] text-[var(--ink-faint)]">约 1 分钟完成</div>
              </div>
            </div>

            <div className="space-y-0">
              {INSTALL_STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-4 border-b border-[rgba(49,56,45,0.06)] last:border-0"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/8 font-['IBM_Plex_Mono'] text-[11px] text-[var(--accent-deep)]">
                    {i + 1}
                  </div>
                  <div className="pt-0.5 text-[14px] leading-6 text-[var(--ink)]">
                    {i === 1 && (
                      <span className="mb-1 block text-[12px] text-[var(--ink-faint)]">
                        如已开启可跳过
                      </span>
                    )}
                    {step}
                    {i === 0 && (
                      <button
                        onClick={() => {
                          copyToClipboard('chrome://extensions');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="ml-2 inline-flex items-center gap-1 rounded-lg bg-[var(--accent)]/8 px-2 py-0.5 text-[11px] text-[var(--accent-deep)] hover:bg-[var(--accent)]/14 transition"
                      >
                        {copied ? <><Check size={10} /> 已复制</> : <><Copy size={10} /> 复制</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--accent)]/5 p-4 text-[12px] leading-6 text-[var(--ink-soft)]">
              <strong className="text-[var(--ink)]">提示</strong>：安装后扩展图标会出现在 Chrome 工具栏右侧。点击图标即可打开 Side Panel 控制面板。
            </div>
          </div>

          {/* Extension status card */}
          <div className="rounded-[32px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.8)] p-6 backdrop-blur-sm md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${extStatus.available ? 'bg-green-100' : 'bg-amber-100'}`}>
                {extStatus.available
                  ? <Check size={18} className="text-green-600" />
                  : <AlertCircle size={18} className="text-amber-600" />
                }
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--ink)]">扩展状态</div>
                <div className="text-[12px] text-[var(--ink-faint)]">实时检测</div>
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${
              extStatus.available
                ? 'border-green-200/60 bg-green-50/50'
                : 'border-amber-200/60 bg-amber-50/50'
            }`}>
              {extStatus.available ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-dot bg-green-500 px-pulse-dot" />
                    <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-green-700">扩展已连接</span>
                  </div>
                  <p className="text-[13px] leading-6 text-green-800/70">
                    MultiPublish 扩展已成功安装并连接。你可以直接开始创作和发布了。
                  </p>
                  {extId && (
                    <div className="rounded-xl bg-white/60 px-3 py-2 font-mono text-[11px] text-[var(--ink-soft)] break-all">
                      ID: {extId}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-dot bg-amber-500 px-blink" />
                    <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-amber-700">等待连接</span>
                  </div>
                  <p className="text-[13px] leading-6 text-amber-800/70">
                    尚未检测到扩展。请按照左侧步骤安装后，打开扩展的 Side Panel 完成握手。
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/60 px-4 py-2 text-[12px] text-[var(--ink)] hover:bg-white transition"
                  >
                    <RefreshCw size={12} /> 刷新检测
                  </button>
                </div>
              )}
            </div>

            {/* Manual ID entry */}
            <details className="mt-4 group">
              <summary className="cursor-pointer text-[12px] text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition">
                自动检测失败？手动输入扩展 ID
              </summary>
              <div className="mt-3 rounded-2xl border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.6)] p-4">
                <p className="mb-3 text-[12px] leading-6 text-[var(--ink-soft)]">
                  在 chrome://extensions 中找到 MultiPublish 扩展，复制其 ID 粘贴到下方。
                </p>
                <div className="flex gap-2">
                  <input
                    defaultValue={extId}
                    placeholder="输入扩展 ID"
                    className="flex-1 rounded-xl border border-[rgba(49,56,45,0.12)] bg-white px-3 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)]/40"
                    id="ext-id-input"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('ext-id-input') as HTMLInputElement;
                      if (input?.value) {
                        localStorage.setItem('cb_extension_id', input.value.trim());
                        window.location.reload();
                      }
                    }}
                    className="px-btn-primary text-[13px] whitespace-nowrap"
                  >
                    保存
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      </Section>

      {/* ── CONNECT SECTION ── */}
      <div ref={connectRef}>
        <Section id="setup-connect">
          <SectionHeading
            overline="02 · 建立连接"
            title="扩展与编辑台自动握手"
            subtitle="安装扩展后，打开任意平台页面或扩展 Side Panel，系统自动完成连接。无需任何手动配置。"
            center
          />

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Globe, title: '打开 Side Panel', desc: '点击 Chrome 工具栏中的扩展图标，打开 MultiPublish 控制面板' },
              { icon: Puzzle, title: '自动检测连接', desc: '扩展通过 chrome.runtime 消息通道自动与编辑台建立长连接' },
              { icon: Shield, title: '安全握手完成', desc: '连接基于 Chrome Extension API 原生通信，不经过第三方服务器' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="rounded-[28px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.78)] p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/8">
                  <item.icon size={20} className="text-[var(--accent-deep)]" strokeWidth={1.5} />
                </div>
                <h3 className="font-['Cormorant_Garamond'] text-[24px] leading-none tracking-[-0.03em] text-[var(--ink)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[13px] leading-6 text-[var(--ink-soft)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Connection flow diagram (text-based) */}
          <div className="mt-10 rounded-[32px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.7)] p-8 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
              {[
                { label: '编辑台 Web', desc: 'Markdown 编辑\n平台适配预览' },
                { label: 'chrome.runtime.sendMessage', desc: '加密消息通道\n自动握手' },
                { label: 'Chrome Extension', desc: 'Background SW\nContent Script' },
                { label: '目标平台页面', desc: 'DOM 注入\n真实发布' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="rounded-2xl border border-[rgba(49,56,45,0.12)] bg-white px-5 py-3 text-center">
                    <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink)]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-[var(--ink-faint)] whitespace-pre-line">{item.desc}</div>
                  </div>
                  {i < 3 && (
                    <ArrowRight size={16} className="shrink-0 text-[var(--ink-faint)] hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ── START SECTION ── */}
      <div ref={startRef}>
        <Section id="setup-start">
          <SectionHeading
            overline="03 · 开始创作"
            title="Markdown 一写，五平台齐发"
            subtitle="从一句话灵感开始，AI 辅助生成提纲和正文，一键适配各平台格式，选择目标平台真实发布。"
            center
          />

          {/* Workflow cards */}
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: '1', icon: Sparkles, title: '灵感输入', desc: '一句话描述你的想法，AI 自动生成标题、提纲和标签' },
              { step: '2', icon: PenLine, title: '编辑完善', desc: '在 Tiptap 富文本编辑器中展开提纲，补充细节和配图' },
              { step: '3', icon: Globe, title: '平台适配', desc: '自动转换为各平台格式，支持 AI 润色——知乎风、小红书风等' },
              { step: '4', icon: Zap, title: '一键发布', desc: 'Content Script 将内容直接注入目标平台编辑器，走完真实发布流程' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="relative rounded-[28px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.78)] p-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 font-['IBM_Plex_Mono'] text-[11px] text-[var(--accent-deep)]">
                  {item.step}
                </div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)]/8">
                  <item.icon size={18} className="text-[var(--accent-deep)]" strokeWidth={1.5} />
                </div>
                <h3 className="font-['Cormorant_Garamond'] text-[22px] leading-none tracking-[-0.03em] text-[var(--ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">{item.desc}</p>

                {/* Connecting line */}
                {i < 3 && (
                  <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-[rgba(49,56,45,0.1)] lg:block" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Platform grid */}
          <div className="mt-12 rounded-[32px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.7)] p-8 backdrop-blur-sm">
            <div className="mb-6 text-center">
              <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                支持平台
              </div>
              <h3 className="mt-2 font-['Cormorant_Garamond'] text-[34px] leading-none tracking-[-0.05em] text-[var(--ink)]">
                五个目的地，一次发布
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-5">
              {PLATFORMS.map((p, i) => (
                <motion.div
                  key={p.key}
                  className="rounded-2xl border border-[rgba(49,56,45,0.08)] bg-white p-5 text-center"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <div className="mx-auto mb-3 h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <div className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.14em] text-[var(--ink)]">
                    {p.name}
                  </div>
                  <div className="mt-2 text-[11px] leading-5 text-[var(--ink-faint)]">{p.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ── BOTTOM CTA ── */}
      <Section className="pb-32">
        <motion.div
          className="rounded-[40px] border border-[rgba(49,56,45,0.12)] bg-[var(--ink)] p-10 text-center text-white md:p-16"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Zap size={28} className="text-[#28D39A]" />
          </div>
          <h2 className="font-['Cormorant_Garamond'] text-[46px] leading-[0.92] tracking-[-0.06em] md:text-[62px]">
            准备好开始了？
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-white/60">
            进入编辑台，用 Markdown 写下你的第一篇内容，选择目标平台，一键真实发布。
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={handleGoDashboard}
              className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-3.5 font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.16em] text-[var(--ink)] transition-all hover:bg-white/90 hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] active:scale-95"
            >
              进入工作台 <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate('/quickstart')}
              className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-transparent px-8 py-3.5 font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.16em] text-white/80 transition-all hover:border-white/40 hover:bg-white/5"
            >
              <Sparkles size={15} /> 快速开始
            </button>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ── */}
      <div className="border-t border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.5)] px-6 py-8 text-center backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-3 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={28} rounded={10} withGlow={false} />
            <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              MultiPublish
            </span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-[var(--ink-faint)]">
            <span>v2.2</span>
            <span>·</span>
            <span>Chrome Manifest V3</span>
            <span>·</span>
            <button onClick={handleGoDashboard} className="hover:text-[var(--ink)] transition">工作台</button>
            <span>·</span>
            <a href="https://github.com/huyan1349/MultiPublish" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--ink)] transition">
              GitHub <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
