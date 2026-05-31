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
    points: ['稿件状态一览', '快速编辑预览', '扩展连接可见'],
  },
  '/editor': {
    label: '编辑台',
    title: 'AI 创作',
    points: ['话题生成大纲', '格式自动适配', '一键真实发布'],
  },
  '/inspiration': {
    label: '灵感',
    title: 'AI 选题引擎',
    points: ['一句话出提纲', '多角度建议', '直达编辑台'],
  },
  '/contents': {
    label: '稿件',
    title: '内容资产',
    points: ['草稿集中管理', '适配效果预览', '发布记录追溯'],
  },
  '/records': {
    label: '记录',
    title: '发布追踪',
    points: ['全平台日志', '成功失败明细', '支持重试'],
  },
  '/welcome': {
    label: '引导',
    title: '快速上手',
    points: ['安装扩展配置', '确认平台登录', '全流程引导'],
  },
  '/settings': {
    label: '设置',
    title: '偏好配置',
    points: ['扩展 ID 管理', '演示模式开关', '版本与草稿'],
  },
};

function resolveCommentary(pathname: string): RouteCommentary {
  if (commentaryMap[pathname]) return commentaryMap[pathname];
  const key = Object.keys(commentaryMap).find((k) => k !== '/' && pathname.startsWith(k));
  if (key) return commentaryMap[key];
  return commentaryMap['/'];
}

const container = {
  enter: { opacity: 0, x: 10 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -6 },
};

const vertical = { writingMode: 'vertical-rl' as const };

export default function DemoPoster({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const c = resolveCommentary(location.pathname);

  return (
    <div className="relative h-full w-full flex items-center justify-center">
      {/* Quiet close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-2 flex items-center gap-1 rounded-full hover:bg-[rgba(49,56,45,0.04)] px-2 py-1 text-[10px] text-[var(--ink-faint)] hover:text-[var(--ink-soft)] transition-all z-10"
      >
        <X size={9} />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={container}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-8"
        >
          {/* Vertical label */}
          <span
            className="text-[11px] tracking-[0.1em] text-[var(--ink-faint)] flex items-center gap-1.5"
            style={vertical}
          >
            <span className="w-1 h-1 rounded-full bg-[var(--accent)]/50" />
            {c.label}
          </span>

          {/* Vertical title — large */}
          <h3
            className="font-['Cormorant_Garamond'] text-[56px] leading-[0.92] tracking-[-0.04em] text-[var(--ink)]"
            style={vertical}
          >
            {c.title}
          </h3>

          {/* Horizontal points — short, fit in narrow column */}
          <ul className="flex flex-col items-center gap-3">
            {c.points.map((point, i) => (
              <motion.li
                key={i}
                className="text-[14px] leading-7 text-[var(--ink-soft)] whitespace-nowrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
