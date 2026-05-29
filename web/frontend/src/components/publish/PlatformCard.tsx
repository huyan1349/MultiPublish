import { CheckCircle, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const platformMeta: Record<string, { color: string; gradient: string; icon: string }> = {
  wechat:    { color: '#07C160', gradient: 'from-emerald-500 to-emerald-600', icon: '微' },
  zhihu:     { color: '#0066FF', gradient: 'from-blue-500 to-blue-600',    icon: '知' },
  bilibili:  { color: '#FB7299', gradient: 'from-pink-500 to-pink-600',     icon: 'B' },
  xiaohongshu: { color: '#FF2442', gradient: 'from-rose-500 to-rose-600',   icon: '红' },
};

const levelIcon = { error: XCircle, warning: AlertTriangle, info: Info };
const levelStyle: Record<string, string> = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};
const levelBg: Record<string, string> = {
  error: 'bg-red-50 border-red-100',
  warning: 'bg-amber-50 border-amber-100',
  info: 'bg-blue-50 border-blue-100',
};

interface PlatformCardProps {
  platform: string;
  platformName: string;
  selected: boolean;
  onToggle: () => void;
  titleCount: number;
  titleMax: number;
  bodyCount: number;
  bodyMax: number;
  tagCount: number;
  tagMax: number;
  messages: Array<{ level: string; field: string; message: string }>;
  previewBody: string;
  previewTags: string[];
}

export default function PlatformCard({
  platform, platformName, selected, onToggle,
  titleCount, titleMax, bodyCount, bodyMax, tagCount, tagMax,
  messages, previewBody, previewTags,
}: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = platformMeta[platform] || platformMeta.wechat;
  const hasIssues = messages.length > 0;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer
        ${selected
          ? 'border-brand/20 bg-brand-light/30 shadow-sm'
          : 'border-border bg-white opacity-60 hover:opacity-100 hover:border-border'}`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}99)` }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-ink">{platformName}</span>
          </div>
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-ink-muted hover:text-ink transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>

        {selected && (
          <div className="space-y-2">
            {/* Title bar */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">标题</span>
              <span className={`font-mono ${titleCount > titleMax ? 'text-red-500' : 'text-ink-muted'}`}>
                {titleCount}/{titleMax}
              </span>
            </div>
            <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (titleCount / titleMax) * 100)}%`,
                  backgroundColor: titleCount > titleMax ? '#ef4444' : meta.color,
                }}
              />
            </div>

            {/* Body count */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">正文字数</span>
              <span className="font-mono text-ink-muted">
                {bodyCount.toLocaleString()}{bodyMax < Infinity ? ` / ${bodyMax.toLocaleString()}` : ''}
              </span>
            </div>

            {/* Tag count */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">标签</span>
              <span className={`font-mono ${tagCount > tagMax ? 'text-red-500' : 'text-ink-muted'}`}>
                {tagCount}/{tagMax}
              </span>
            </div>

            {/* Validation */}
            {hasIssues && (
              <div className="pt-2 border-t border-border space-y-1">
                {messages.map((m, i) => {
                  const Icon = levelIcon[m.level] || Info;
                  return (
                    <p key={i} className={`flex items-center gap-1.5 text-xs ${levelStyle[m.level] || 'text-ink-muted'}`}>
                      <Icon size={11} /> {m.message}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded preview */}
      {expanded && selected && (
        <div className="border-t border-border px-4 py-3 bg-surface/50 rounded-b-xl">
          <p className="text-xs text-ink-muted mb-1.5">适配预览</p>
          <pre className="text-xs text-ink-secondary leading-relaxed line-clamp-4 font-mono whitespace-pre-wrap">{previewBody}</pre>
          {previewTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {previewTags.map((t, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-md bg-white text-ink-muted text-xs border border-border">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
