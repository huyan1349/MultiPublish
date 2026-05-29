import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { PlatformPublishState } from '../../stores/contentStore';

const platformMeta: Record<string, { color: string; gradient: string; icon: string }> = {
  wechat:    { color: '#07C160', gradient: 'from-emerald-500/20 to-emerald-600/5', icon: '微' },
  zhihu:     { color: '#0066FF', gradient: 'from-blue-500/20 to-blue-600/5',    icon: '知' },
  bilibili:  { color: '#FB7299', gradient: 'from-pink-500/20 to-pink-600/5',     icon: 'B' },
  xiaohongshu: { color: '#FF2442', gradient: 'from-rose-500/20 to-rose-600/5',   icon: '红' },
};

const levelIcon = { error: XCircle, warning: AlertTriangle, info: Info };
const levelStyle: Record<string, string> = {
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};

const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
  idle:       { bg: 'bg-transparent', border: 'border-white/6', text: 'text-slate-400', label: '待发布' },
  publishing: { bg: 'bg-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-400', label: '发布中…' },
  success:    { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400', label: '已发布' },
  failed:     { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400', label: '失败' },
};

interface PlatformCardProps {
  state: PlatformPublishState;
  selected: boolean;
  onToggle: () => void;
}

export default function PlatformCard({ state, selected, onToggle }: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = platformMeta[state.platform] || platformMeta.wechat;
  const sc = statusConfig[state.status];
  const hasIssues = state.validation.messages.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
        ${selected ? `${sc.border} ${sc.bg}` : 'border-white/6 bg-white/[0.02] opacity-60'}
        hover:border-white/15`}
      onClick={onToggle}
    >
      {/* Gradient accent bar at top */}
      {selected && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
      )}

      <div className="p-4">
        {/* Header: icon + name + status */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}99)` }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-200">{state.platformName}</span>
              {state.status !== 'idle' && (
                <span className={`text-xs ${sc.text}`}>{sc.label}</span>
              )}
            </div>
          </div>
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-slate-500 hover:text-slate-300 transition"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        {/* Quick stats */}
        {selected && (
          <>
            {/* Title count + progress bar */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">标题</span>
                <span className={`font-mono ${state.meta.titleCharCount > state.meta.maxTitleLength ? 'text-red-400' : 'text-slate-400'}`}>
                  {state.meta.titleCharCount}/{state.meta.maxTitleLength}
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (state.meta.titleCharCount / state.meta.maxTitleLength) * 100)}%`,
                    background: state.meta.titleCharCount > state.meta.maxTitleLength
                      ? '#ef4444'
                      : `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">正文字数</span>
                <span className="font-mono text-slate-400">
                  {state.meta.bodyCharCount.toLocaleString()}
                  {state.meta.maxBodyLength < Infinity && ` / ${state.meta.maxBodyLength.toLocaleString()}`}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">标签</span>
                <span className={`font-mono ${state.meta.tagCount > state.meta.maxTags ? 'text-red-400' : 'text-slate-400'}`}>
                  {state.meta.tagCount}/{state.meta.maxTags}
                </span>
              </div>
            </div>

            {/* Validation messages */}
            {hasIssues && (
              <div className="space-y-1 pt-2 border-t border-white/5">
                {state.validation.messages.map((m, i) => {
                  const Icon = levelIcon[m.level] || Info;
                  return (
                    <p key={i} className={`flex items-center gap-1.5 text-xs ${levelStyle[m.level] || 'text-slate-400'}`}>
                      <Icon size={11} />
                      <span>{m.message}</span>
                    </p>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Expanded preview */}
      {expanded && selected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-white/5 px-4 py-3 bg-white/[0.01]"
        >
          <p className="text-xs text-slate-500 mb-1.5">适配预览</p>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 font-mono whitespace-pre-wrap">
            {state.output.body}
          </p>
          {state.output.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {state.output.tags.map((t, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 text-xs">{t}</span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Error message */}
      {state.status === 'failed' && state.message && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-400/80">{state.message}</p>
        </div>
      )}
    </motion.div>
  );
}
