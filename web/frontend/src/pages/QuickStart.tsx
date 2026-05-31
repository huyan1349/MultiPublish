import { useNavigate } from 'react-router-dom';
import { ArrowRight, PenLine, FileText, Sparkles, LayoutDashboard, Clock, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandMark from '../components/brand/BrandMark';
import { useExtensionStatus } from '../hooks/useExtensionStatus';

const container = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const features = [
  {
    to: '/editor',
    icon: PenLine,
    label: '编辑台',
    desc: 'Markdown 写作，实时预览，Tiptap 富文本编辑器。',
    accent: 'from-emerald-500/10 to-teal-500/5',
  },
  {
    to: '/inspiration',
    icon: Sparkles,
    label: '灵感',
    desc: 'AI 驱动的选题建议、标题生成和风格润色。',
    accent: 'from-amber-500/10 to-orange-500/5',
  },
  {
    to: '/contents',
    icon: FileText,
    label: '稿件',
    desc: '管理所有草稿与已发布内容，追溯每一篇。',
    accent: 'from-sky-500/10 to-blue-500/5',
  },
  {
    to: '/records',
    icon: Clock,
    label: '记录',
    desc: '发布历史、各平台状态和错误追踪。',
    accent: 'from-violet-500/10 to-purple-500/5',
  },
];

const flowSteps = [
  { icon: Sparkles, label: '灵感采集', detail: 'AI 选题与标题' },
  { icon: PenLine, label: '编辑写作', detail: 'Markdown + 富文本' },
  { icon: Zap, label: '平台适配', detail: '自动格式转换' },
  { icon: FileText, label: '多端发布', detail: '一键真实推送' },
];

function ExtensionBadge() {
  const extStatus = useExtensionStatus();
  if (extStatus.checking) return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-1 text-[11px] text-[var(--accent-deep)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" /> 检测中
    </span>
  );
  if (extStatus.available) return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-300/40 bg-green-100/60 px-3 py-1 text-[11px] text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> 扩展已连接
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/30 bg-red-100/50 px-3 py-1 text-[11px] text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> 扩展未连接
    </span>
  );
}

export default function QuickStart() {
  const navigate = useNavigate();

  return (
    <div className="">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">

        {/* Hero */}
        <motion.section
          className="relative overflow-hidden px-card px-paper p-8 md:p-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-none absolute right-8 top-8 opacity-[0.03] select-none md:right-14 md:top-12">
            <BrandMark size={220} rounded={60} />
          </div>
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <BrandMark size={40} rounded={14} />
                <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">MultiPublish</span>
              </div>
              <h1 className="font-['Cormorant_Garamond'] text-[52px] leading-[0.92] tracking-[-0.07em] text-[var(--ink)]">
                一次创作，
                <br />
                多端真实分发
              </h1>
              <p className="max-w-[520px] text-[14px] leading-7 text-[var(--ink-soft)]">
                从灵感到发布只需四步。选择平台，AI 自动适配格式，内容真实注入目标编辑器，一键走完发布流程。
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => navigate('/editor')} className="px-btn-primary">
                  开始写作 <ArrowRight size={14} />
                </button>
                <button onClick={() => navigate('/inspiration')} className="px-btn-secondary">
                  获取灵感
                </button>
                <ExtensionBadge />
              </div>
            </div>

            {/* Flow diagram */}
            <div className="flex items-center gap-0 rounded-[24px] border border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.5)] p-4 lg:min-w-[480px]">
              {flowSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-0">
                  <div className="flex flex-col items-center gap-2 text-center min-w-[90px]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[var(--accent)]/8">
                      <step.icon size={18} className="text-[var(--accent-deep)]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-[var(--ink)]">{step.label}</span>
                    <span className="text-[10px] text-[var(--ink-faint)] leading-tight">{step.detail}</span>
                  </div>
                  {i < flowSteps.length - 1 && (
                    <div className="flex items-center px-1 pb-6">
                      <div className="h-px w-6 bg-[rgba(49,56,45,0.1)]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Feature cards */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          variants={container}
          initial="initial"
          animate="animate"
        >
          {features.map((f) => (
            <motion.button
              key={f.to}
              variants={item}
              onClick={() => navigate(f.to)}
              className="group relative overflow-hidden rounded-[24px] border border-[rgba(49,56,45,0.08)] bg-[rgba(255,255,255,0.8)] p-6 text-left transition-all duration-300 hover:border-[rgba(49,56,45,0.16)] hover:bg-white hover:shadow-[0_12px_32px_rgba(40,46,38,0.06)]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--accent)]/8">
                  <f.icon size={20} className="text-[var(--accent-deep)]" strokeWidth={1.5} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-['Cormorant_Garamond'] text-[22px] leading-none tracking-[-0.03em] text-[var(--ink)]">
                    {f.label}
                  </span>
                  <ChevronRight size={14} className="text-[var(--ink-faint)] group-hover:text-[var(--accent-deep)] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[13px] leading-6 text-[var(--ink-soft)]">{f.desc}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.section
          className="px-card px-paper p-8 md:p-10 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="mx-auto max-w-[500px] space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap size={18} className="text-[var(--accent-deep)]" />
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">真实发布</span>
            </div>
            <h2 className="font-['Cormorant_Garamond'] text-[36px] leading-[0.95] tracking-[-0.05em] text-[var(--ink)]">
              准备好开始了吗？
            </h2>
            <p className="text-[14px] leading-7 text-[var(--ink-soft)]">
              还没安装扩展？前往引导页完成配置，或直接进入工作台开始创作。
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => navigate('/welcome')} className="px-btn-secondary">
                配置扩展
              </button>
              <button onClick={() => navigate('/')} className="px-btn-primary">
                <LayoutDashboard size={14} /> 进入工作台
              </button>
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
