import { Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { PlatformType } from '../../adapters/types';

type Status = 'idle' | 'publishing' | 'success' | 'failed';

interface PublishButtonProps {
  publishing?: boolean;
  selectedCount: number;
  platformStatuses: Map<PlatformType, Status>;
  onPublish: () => void;
}

export default function PublishButton({ publishing: _externalPublishing, selectedCount, platformStatuses, onPublish }: PublishButtonProps) {
  const statuses = Array.from(platformStatuses.values());
  const publishing = statuses.some((s) => s === 'publishing');
  const allDone = statuses.length > 0 && statuses.every((s) => s === 'success' || s === 'failed');
  const hasFailed = statuses.some((s) => s === 'failed');
  const hasSuccess = statuses.some((s) => s === 'success');

  let Icon = Rocket;
  let label = 'PUBLISH';
  let variant: 'primary' | 'success' | 'danger' = 'primary';

  if (publishing) {
    Icon = Loader2;
    label = 'PUBLISHING…';
  } else if (allDone) {
    if (hasFailed && !hasSuccess) {
      Icon = XCircle;
      label = 'FAILED';
      variant = 'danger';
    } else {
      Icon = CheckCircle2;
      label = hasFailed ? 'PARTIAL' : 'DONE';
      variant = 'success';
    }
  }

  const variantClass = variant === 'primary'
    ? 'px-btn-primary'
    : variant === 'success'
      ? 'px-btn-primary'
      : 'px-btn-danger';

  return (
    <button
      onClick={onPublish}
      disabled={publishing || selectedCount === 0}
      className={`w-full py-3 px-4 font-mono font-bold text-[11px] tracking-wide flex items-center justify-center gap-2 transition-[background-color,color,border-color,transform,opacity] duration-150 active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClass}`}
    >
      {publishing ? <Icon size={15} className="animate-spin" /> : <Icon size={15} />}
      {label}
      {!publishing && !allDone && selectedCount > 0 && (
        <span className="opacity-40 text-[9px]">({selectedCount})</span>
      )}
    </button>
  );
}
