import { Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { PlatformType } from '../../adapters/types';

type Status = 'idle' | 'publishing' | 'success' | 'failed';

interface PublishButtonProps {
  publishing?: boolean;
  selectedCount: number;
  platformStatuses: Map<PlatformType, Status>;
  onPublish: () => void;
}

export default function PublishButton({ publishing: _ext, selectedCount, platformStatuses, onPublish }: PublishButtonProps) {
  const statuses = Array.from(platformStatuses.values());
  const isPublishing = statuses.some((s) => s === 'publishing');
  const allDone = statuses.length > 0 && statuses.every((s) => s === 'success' || s === 'failed');
  const hasFailed = statuses.some((s) => s === 'failed');
  const hasSuccess = statuses.some((s) => s === 'success');

  let Icon = Rocket;
  let label = 'PUBLISH';
  let cls = 'px-btn-primary w-full py-2.5 font-mono text-[10px] tracking-wide';

  if (isPublishing) {
    Icon = Loader2;
    label = 'SENDING…';
  } else if (allDone) {
    if (hasFailed && !hasSuccess) {
      Icon = XCircle;
      label = 'FAILED';
      cls = 'px-btn w-full py-2.5 font-mono text-[10px] tracking-wide border-dot-red text-dot-red';
    } else {
      Icon = CheckCircle2;
      label = hasFailed ? 'PARTIAL' : 'DONE';
      cls = 'px-btn w-full py-2.5 font-mono text-[10px] tracking-wide border-emerald-500 text-emerald-500';
    }
  }

  return (
    <button
      onClick={onPublish}
      disabled={isPublishing || selectedCount === 0}
      className={cls}
    >
      {isPublishing ? <Icon size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
      {!isPublishing && !allDone && selectedCount > 0 && (
        <span className="opacity-40 text-[9px]">({selectedCount})</span>
      )}
    </button>
  );
}
