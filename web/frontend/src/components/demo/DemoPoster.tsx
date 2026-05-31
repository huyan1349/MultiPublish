import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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
    subtitle: '统一管理所有稿件的发布状态',
    highlights: [
      '卡片式展示所有内容，标题、平台、状态一目了然',
      '快速跳转编辑、预览或查看发布记录',
      '扩展连接状态实时可见，发布前确保环境就绪',
    ],
  },
  '/editor': {
    label: '编辑台',
    title: 'AI 驱动的内容创作',
    subtitle: '从大纲到多平台发布，三步完成',
    highlights: [
      '输入话题与关键要点，AI 生成结构化大纲',
      '选择平台与内容格式，AI 自动生成适配正文',
      '校验字数与格式，一键推送到真实平台编辑器',
    ],
  },
  '/inspiration': {
    label: '灵感面板',
    title: 'AI 选题引擎',
    subtitle: '一句话获取标题、提纲与标签',
    highlights: [
      '输入感兴趣的方向，AI 生成多个选题角度',
      '自动输出建议标题、内容提纲、推荐标签',
      '一键导入编辑台，无缝衔接内容创作流程',
    ],
  },
  '/contents': {
    label: '稿件管理',
    title: '内容资产中心',
    subtitle: '统一管理草稿与已发布内容',
    highlights: [
      '列表视图展示所有稿件，支持搜索与筛选',
      '每篇稿件可单独预览各平台适配效果',
      '关联发布记录，追溯每次发布的完整历史',
    ],
  },
  '/records': {
    label: '发布记录',
    title: '发布状态追踪',
    subtitle: '每一次发布的完整审计日志',
    highlights: [
      '按时间线展示所有平台发布操作记录',
      '精确到每个平台的成功/失败状态与原因',
      '支持失败重试，无需重新编辑即可再次发布',
    ],
  },
  '/welcome': {
    label: '引导页',
    title: '快速上手指南',
    subtitle: '配置扩展，确认登录，开始创作',
    highlights: [
      '三步安装 Chrome 扩展，自动检测连接状态',
      '逐平台确认已登录，保证发布链路畅通',
      '了解从灵感到发布的标准创作工作流',
    ],
  },
  '/settings': {
    label: '设置',
    title: '偏好与系统配置',
    subtitle: '管理扩展、草稿与演示模式',
    highlights: [
      '配置 Chrome 扩展 ID，手动绑定扩展连接',
      '一键开启 PPT 演示模式，用于产品路演',
      '草稿缓存管理，版本更新记录查阅',
    ],
  },
};

function resolveCommentary(pathname: string): RouteCommentary {
  if (commentaryMap[pathname]) return commentaryMap[pathname];
  const key = Object.keys(commentaryMap).find((k) => k !== '/' && pathname.startsWith(k));
  if (key) return commentaryMap[key];
  return commentaryMap['/'];
}

const container = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function DemoPoster({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const c = resolveCommentary(location.pathname);

  return (
    <div className="relative w-full pl-10 pr-12">
      {/* Subtle close */}
      <button
        onClick={onClose}
        className="absolute top-0 right-6 flex items-center gap-1 rounded-full border border-[rgba(49,56,45,0.08)] px-3 py-1.5 text-[11px] text-[var(--ink-faint)] hover:text-[var(--ink-soft)] hover:border-[rgba(49,56,45,0.15)] transition-all"
      >
        <X size={10} />
        退出演示
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={container}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Label pill */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(49,56,45,0.1)] bg-white/70 px-3.5 py-1.5 text-[10px] tracking-[0.04em] text-[var(--ink-soft)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {c.label}
            </span>
          </div>

          {/* Main title */}
          <h2 className="font-['Cormorant_Garamond'] text-[72px] leading-[0.88] tracking-[-0.06em] text-[var(--ink)] mb-3">
            {c.title}
          </h2>

          {/* Subtitle */}
          <p className="font-['Cormorant_Garamond'] text-[30px] leading-[1.05] tracking-[-0.04em] text-[var(--accent-deep)] mb-10">
            {c.subtitle}
          </p>

          {/* Thin rule */}
          <div className="w-14 h-px bg-[rgba(49,56,45,0.12)] mb-8" />

          {/* Highlights */}
          <ul className="space-y-4">
            {c.highlights.map((point, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-3 text-[13px] leading-6 text-[var(--ink-soft)]"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.07 }}
              >
                <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-[var(--accent)]/35" />
                {point}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
