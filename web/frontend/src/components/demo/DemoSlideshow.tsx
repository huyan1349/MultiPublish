import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Presentation, X } from 'lucide-react';

interface RouteCommentary {
  label: string;
  title: string;
  subtitle: string;
  highlights: string[];
}

const commentaryMap: Record<string, RouteCommentary> = {
  '/': {
    label: '工作台',
    title: '内容总览',
    subtitle: '所有稿件的统一管理面板',
    highlights: [
      '卡片式展示所有内容，标题、平台、状态一目了然',
      '快速跳转编辑、预览或查看发布记录',
      '扩展连接状态实时可见，发布前确保环境就绪',
    ],
  },
  '/editor': {
    label: '编辑台',
    title: 'AI 驱动的内容创作',
    subtitle: '从大纲到发布，三步完成',
    highlights: [
      '第一步：输入话题与要点，AI 生成结构化大纲',
      '第二步：选择平台与格式，AI 自动生成适配内容',
      '第三步：校验字数与格式，一键推送到真实平台',
    ],
  },
  '/inspiration': {
    label: '灵感面板',
    title: 'AI 选题引擎',
    subtitle: '一句话获取标题、提纲与标签',
    highlights: [
      '输入灵感兴趣方向，AI 生成多个选题角度',
      '自动输出建议标题、内容提纲、推荐标签',
      '一键导入编辑台，直接开始内容创作',
    ],
  },
  '/contents': {
    label: '稿件管理',
    title: '内容资产中心',
    subtitle: '统一管理草稿与已发布内容',
    highlights: [
      '列表视图展示所有稿件，支持搜索与筛选',
      '每篇稿件可预览各平台适配效果',
      '关联发布记录，追溯每次发布的完整历史',
    ],
  },
  '/records': {
    label: '发布记录',
    title: '发布状态追踪',
    subtitle: '每一次发布的完整审计日志',
    highlights: [
      '按时间线展示所有发布操作记录',
      '精确到每个平台的成功/失败状态与原因',
      '支持失败重试，无需重新编辑内容',
    ],
  },
  '/welcome': {
    label: '引导页',
    title: '快速上手指南',
    subtitle: '配置扩展，确认登录，开始创作',
    highlights: [
      '三步安装 Chrome 扩展，自动检测连接状态',
      '逐平台确认已登录，确保发布链路畅通',
      '了解从灵感到发布的标准工作流',
    ],
  },
  '/settings': {
    label: '设置',
    title: '偏好与系统配置',
    subtitle: '管理扩展、草稿与版本信息',
    highlights: [
      '配置 Chrome 扩展 ID，手动绑定连接',
      '开启演示模式，在路演中展示产品能力',
      '管理草稿缓存，查看版本更新记录',
    ],
  },
};

function resolveCommentary(pathname: string): RouteCommentary {
  // exact match first
  if (commentaryMap[pathname]) return commentaryMap[pathname];
  // fuzzy match by prefix
  const key = Object.keys(commentaryMap).find((k) => k !== '/' && pathname.startsWith(k));
  if (key) return commentaryMap[key];
  return commentaryMap['/'];
}

const variants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function DemoSlideshow({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const commentary = resolveCommentary(location.pathname);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 shrink-0 border-b border-[rgba(49,56,45,0.05)]">
        <div className="flex items-center gap-2">
          <Presentation size={14} className="text-[var(--accent-deep)]" />
          <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            演示解说
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-full border border-[rgba(49,56,45,0.1)] px-3 py-1.5 text-[11px] text-[var(--ink-soft)] hover:bg-[rgba(49,56,45,0.04)] transition-all"
        >
          <X size={11} />
          退出
        </button>
      </div>

      {/* Commentary area */}
      <div className="flex-1 flex items-center px-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 -right-12 w-56 h-56 rounded-full bg-[var(--accent)]/3 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Label pill */}
              <div className="mb-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(49,56,45,0.1)] bg-[rgba(249,250,248,0.9)] px-4 py-1.5 text-[11px] text-[var(--ink-soft)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  {commentary.label}
                </span>
              </div>

              {/* Title */}
              <h2 className="font-['Cormorant_Garamond'] text-[60px] leading-[0.88] tracking-[-0.06em] text-[var(--ink)] mb-3">
                {commentary.title}
              </h2>

              {/* Subtitle */}
              <p className="font-['Cormorant_Garamond'] text-[28px] leading-[0.95] tracking-[-0.04em] text-[var(--accent-deep)] mb-9">
                {commentary.subtitle}
              </p>

              {/* Divider */}
              <div className="w-12 h-px bg-[rgba(49,56,45,0.12)] mb-7" />

              {/* Highlights */}
              <ul className="space-y-3.5">
                {commentary.highlights.map((point, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3 text-[13px] leading-6 text-[var(--ink-soft)]"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-[var(--accent)]/40" />
                    {point}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom route indicator */}
      <div className="px-6 py-3.5 shrink-0 border-t border-[rgba(49,56,45,0.05)]">
        <div className="flex items-center gap-4 text-[10px] text-[var(--ink-faint)] font-mono">
          <span>当前页面</span>
          <span className="text-[var(--ink-soft)]">{location.pathname}</span>
          <span className="ml-auto">{commentary.label}</span>
        </div>
      </div>
    </div>
  );
}
