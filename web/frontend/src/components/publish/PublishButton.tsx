import { motion } from 'framer-motion';
import { Rocket, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { PlatformType } from '../../adapters/types';
import type { PublishStatus } from '../../stores/contentStore';

interface PublishButtonProps {
  isPublishing: boolean;
  selectedCount: number;
  platformStatuses: Map<PlatformType, PublishStatus>;
  onPublish: () => void;
}

export default function PublishButton({ isPublishing, selectedCount, platformStatuses, onPublish }: PublishButtonProps) {
  const statuses = Array.from(platformStatuses.values());
  const allDone = statuses.length > 0 && statuses.every((s) => s === 'success' || s === 'failed');
  const hasSuccess = statuses.some((s) => s === 'success');
  const hasFailed = statuses.some((s) => s === 'failed');

  let buttonStyle = '';
  let Icon = Rocket;
  let label = '一键发布';

  if (isPublishing) {
    Icon = Loader2;
    label = '发布中…';
  } else if (allDone) {
    if (hasFailed && !hasSuccess) {
      Icon = XCircle;
      label = '发布失败';
      buttonStyle = 'from-red-500 to-red-600';
    } else if (hasFailed) {
      Icon = CheckCircle;
      label = '部分完成';
      buttonStyle = 'from-amber-500 to-amber-600';
    } else {
      Icon = CheckCircle;
      label = '发布完成';
      buttonStyle = 'from-emerald-500 to-emerald-600';
    }
  }

  return (
    <motion.button
      whileHover={!isPublishing && !allDone ? { scale: 1.02 } : {}}
      whileTap={!isPublishing && !allDone ? { scale: 0.98 } : {}}
      onClick={onPublish}
      disabled={isPublishing || selectedCount === 0}
      className={`relative w-full py-3 rounded-xl font-semibold text-sm text-white
        transition-all duration-300 flex items-center justify-center gap-2
        disabled:opacity-40 disabled:cursor-not-allowed
        ${buttonStyle || 'from-blue-500 to-purple-600'}
        ${!buttonStyle ? 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]' : ''}
      `}
      style={!buttonStyle ? { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' } : {}}
    >
      {/* Ripple effect when publishing */}
      {isPublishing && (
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
      )}

      <Icon size={18} className={isPublishing ? 'animate-spin' : ''} />
      <span>{label}</span>

      {!isPublishing && !allDone && (
        <span className="text-white/60 text-xs">({selectedCount})</span>
      )}
    </motion.button>
  );
}
