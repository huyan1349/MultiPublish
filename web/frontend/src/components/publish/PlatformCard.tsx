import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const platformMeta: Record<string, { color: string; icon: string }> = {
  wechat:      { color: '#07C160', icon: '微' },
  zhihu:       { color: '#0066FF', icon: '知' },
  bilibili:    { color: '#FB7299', icon: 'B' },
  xiaohongshu: { color: '#FF2442', icon: '红' },
};

const levelIcon: Record<string, typeof XCircle> = { error: XCircle, warning: AlertTriangle, info: Info };
const levelStyle: Record<string, string> = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

interface PlatformCardProps {
  platform: string;
  platformName: string;
  selected: boolean;
  onToggle: () => void;
  status?: string;
  statusMessage?: string;
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
      className={`rounded-lg border transition-all duration-150 cursor-pointer overflow-hidden
        ${selected
          ? 'border-transparent shadow-card-hover'
          : 'border-border bg-white opacity-50 hover:opacity-80'}`}
      onClick={onToggle}
    >
      <div className="h-[2px]" style={{ backgroundColor: selected ? meta.color : 'transparent' }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white font-display font-700 text-[11px] shrink-0"
            style={{ backgroundColor: meta.color }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-display font-600 text-sm text-ink">{platformName}</span>
          </div>
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-ink-faint hover:text-ink transition-colors p-0.5"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>

        {selected && (
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-ink-muted">标题</span>
                <span className={`font-mono ${titleCount > titleMax ? 'text-red-500 font-500' : 'text-ink-faint'}`}>
                  {titleCount}/{titleMax}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-surface-warm overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (titleCount / titleMax) * 100)}%`,
                    backgroundColor: titleCount > titleMax ? '#ef4444' : meta.color,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ink-muted">正文字数</span>
              <span className="font-mono text-ink-faint">
                {bodyCount.toLocaleString()}{bodyMax < Infinity ? ` / ${bodyMax.toLocaleString()}` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ink-muted">标签</span>
              <span className={`font-mono ${tagCount > tagMax ? 'text-red-500 font-500' : 'text-ink-faint'}`}>
                {tagCount}/{tagMax}
              </span>
            </div>

            {hasIssues && (
              <div className="pt-2 border-t border-border space-y-1">
                {messages.map((m, i) => {
                  const Icon = levelIcon[m.level] || Info;
                  return (
                    <p key={i} className={`flex items-center gap-1.5 text-[11px] ${levelStyle[m.level] || 'text-ink-muted'}`}>
                      <Icon size={10} /> {m.message}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && selected && (
        <div className="border-t border-border px-4 py-3 bg-surface-warm/50">
          <p className="text-[11px] text-ink-faint mb-1.5">适配预览</p>
          <pre className="text-[11px] text-ink-secondary leading-relaxed line-clamp-4 font-mono whitespace-pre-wrap">{previewBody}</pre>
          {previewTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {previewTags.map((t, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-white text-ink-muted border border-border">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
