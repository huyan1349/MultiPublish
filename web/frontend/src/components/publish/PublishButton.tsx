import { Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { PlatformType } from '../../adapters/types';

type Status = 'idle' | 'publishing' | 'success' | 'failed';

interface PublishButtonProps {
  selectedCount: number;
  platformStatuses: Map<PlatformType, Status>;
  onPublish: () => void;
}

export default function PublishButton({ selectedCount, platformStatuses, onPublish }: PublishButtonProps) {
  const statuses = Array.from(platformStatuses.values());
  const publishing = statuses.some((s) => s === 'publishing');
  const allDone = statuses.length > 0 && statuses.every((s) => s === 'success' || s === 'failed');
  const hasFailed = statuses.some((s) => s === 'failed');
  const hasSuccess = statuses.some((s) => s === 'success');

  let Icon = Rocket;
  let label = '发布到选中平台';
  let variant: 'primary' | 'success' | 'danger' = 'primary';

  if (publishing) {
    Icon = Loader2;
    label = '发布中…';
  } else if (allDone) {
    if (hasFailed && !hasSuccess) {
      Icon = XCircle;
      label = '发布失败';
      variant = 'danger';
    } else {
      Icon = CheckCircle2;
      label = hasFailed ? '部分完成' : '发布完成';
      variant = 'success';
    }
  }

  const baseClass = 'w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100';

  const variantClass = variant === 'primary'
    ? 'bg-brand text-white hover:bg-brand-hover'
    : variant === 'success'
      ? 'bg-emerald-500 text-white'
      : 'bg-red-500 text-white';

  return (
    <button
      onClick={onPublish}
      disabled={publishing || selectedCount === 0}
      className={`${baseClass} ${variantClass}`}
    >
      {publishing ? <Icon size={18} className="animate-spin" /> : <Icon size={18} />}
      {label}
      {!publishing && !allDone && selectedCount > 0 && (
        <span className="opacity-60 text-xs">({selectedCount})</span>
      )}
    </button>
  );
}
