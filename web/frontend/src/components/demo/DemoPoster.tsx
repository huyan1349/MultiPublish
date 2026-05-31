import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface RouteCommentary {
  label: string;
  title: string;
  points: string[];
}

const commentaryMap: Record<string, RouteCommentary> = {
  '/': {
    label: '工作台',
    title: '内容总览',
    points: ['所有稿件状态一览', '快速跳转编辑与预览', '扩展连接实时可见'],
  },
  '/editor': {
    label: '编辑台',
    title: 'AI 创作',
    points: ['话题 → AI 大纲', '平台格式自动适配', '一键真实发布'],
  },
  '/inspiration': {
    label: '灵感',
    title: 'AI 选题引擎',
    points: ['一句话生成标题与提纲', '多角度选题建议', '导入编辑台无缝创作'],
  },
  '/contents': {
    label: '稿件',
    title: '内容资产中心',
    points: ['草稿与已发布管理', '各平台适配效果预览', '关联发布记录追溯'],
  },
  '/records': {
    label: '记录',
    title: '发布追踪',
    points: ['全平台发布日志', '成功/失败状态明细', '支持失败重试'],
  },
  '/welcome': {
    label: '引导',
    title: '快速上手',
    points: ['安装扩展 · 配置连接', '确认各平台已登录', '从灵感到发布全流程'],
  },
  '/settings': {
    label: '设置',
    title: '偏好配置',
    points: ['扩展 ID 管理', '演示模式开关', '草稿与版本信息'],
  },
};

function resolveCommentary(pathname: string): RouteCommentary {
  if (commentaryMap[pathname]) return commentaryMap[pathname];
  const key = Object.keys(commentaryMap).find((k) => k !== '/' && pathname.startsWith(k));
  if (key) return commentaryMap[key];
  return commentaryMap['/'];
}

const container = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export default function DemoPoster({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const c = resolveCommentary(location.pathname);

  return (
    <div className="relative w-full pl-8 pr-8">
      {/* Quiet close button */}
      <button
        onClick={onClose}
        className="absolute -top-2 right-5 flex items-center gap-1 rounded-full border border-transparent hover:border-[rgba(49,56,45,0.08)] px-2.5 py-1 text-[10px] text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition-all"
      >
        <X size={9} />
        退出
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={container}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Small label */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-[var(--ink-faint)]">
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]/50" />
              {c.label}
            </span>
          </div>

          {/* Title — smaller, less dominant */}
          <h3 className="font-['Cormorant_Garamond'] text-[38px] leading-[0.94] tracking-[-0.05em] text-[var(--ink)] mb-6">
            {c.title}
          </h3>

          {/* Points — like annotations */}
          <ul className="space-y-3">
            {c.points.map((point, i) => (
              <motion.li
                key={i}
                className="text-[12px] leading-6 text-[var(--ink-soft)]"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                {point}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
