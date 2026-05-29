import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, Wand2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { beautifyForPlatform } from '../../services/deepseek';

const platformMeta: Record<string, { color: string; label: string }> = {
  wechat:      { color: '#07C160', label: 'WC' },
  zhihu:       { color: '#0066FF', label: 'ZH' },
  bilibili:    { color: '#FB7299', label: 'BL' },
  xiaohongshu: { color: '#FF2442', label: 'XH' },
};

const levelIcon: Record<string, typeof XCircle> = { error: XCircle, warning: AlertTriangle, info: Info };
const levelColor: Record<string, string> = { error: 'text-dot-red', warning: 'text-amber-500', info: 'text-tx-dim' };

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
  onBeautified?: (title: string, body: string, tags: string[]) => void;
}

export default function PlatformCard({
  platform, platformName, selected, onToggle,
  titleCount, titleMax, bodyCount, bodyMax, tagCount, tagMax,
  messages, previewBody, previewTags, onBeautified,
}: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [beautifying, setBeautifying] = useState(false);
  const meta = platformMeta[platform] || platformMeta.wechat;

  const handleBeautify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBeautifying(true);
    try {
      const result = await beautifyForPlatform({
        platform, platformName,
        title: '', body: previewBody, tags: previewTags,
      });
      onBeautified?.(result.title, result.body, result.tags);
    } catch {}
    setBeautifying(false);
  };

  return (
    <div
      className={`border transition-all duration-150 cursor-pointer overflow-hidden
        ${selected
          ? 'bg-white border-px-border hover:border-tx-mute'
          : 'bg-px-surface border-px-border-subtle opacity-40 hover:opacity-70'}`}
      style={{ borderRadius: 0 }}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="px-dot" style={{ backgroundColor: meta.color }} />
          <span className="font-mono font-bold text-[10px] text-tx tracking-wide">{platformName.toUpperCase()}</span>
          <span className="font-mono text-[8px] text-tx-faint">{meta.label}</span>
          {selected && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleBeautify}
                disabled={beautifying}
                className="px-btn-ghost text-[8px] px-1.5 py-1"
                title="AI 美化"
              >
                {beautifying ? <RefreshCw size={10} className="animate-spin" /> : <Wand2 size={10} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="text-tx-faint hover:text-tx-dim transition-colors p-0.5"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          )}
        </div>

        {selected && (
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between font-mono text-[9px] mb-1">
                <span className="text-tx-faint">TITLE</span>
                <span className={titleCount > titleMax ? 'text-dot-red' : 'text-tx-faint'}>
                  {titleCount}/{titleMax}
                </span>
              </div>
              <div className="px-progress">
                <div className="px-progress-bar" style={{
                  width: `${Math.min(100, (titleCount / titleMax) * 100)}%`,
                  backgroundColor: titleCount > titleMax ? '#FF3B30' : meta.color,
                }} />
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-tx-faint">BODY</span>
              <span className="text-tx-faint">
                {bodyCount.toLocaleString()}{bodyMax < Infinity ? `/${bodyMax.toLocaleString()}` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-tx-faint">TAGS</span>
              <span className={tagCount > tagMax ? 'text-dot-red' : 'text-tx-faint'}>
                {tagCount}/{tagMax}
              </span>
            </div>

            {messages.length > 0 && (
              <div className="pt-2 border-t border-px-border-subtle space-y-0.5">
                {messages.map((m, i) => {
                  const Icon = levelIcon[m.level] || Info;
                  return (
                    <p key={i} className={`flex items-center gap-1 font-mono text-[9px] ${levelColor[m.level] || 'text-tx-faint'}`}>
                      <Icon size={9} /> {m.message}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && selected && (
        <div className="border-t border-px-border-subtle px-4 py-3 bg-px-bg">
          <span className="font-mono text-[9px] text-tx-faint">PREVIEW</span>
          <pre className="font-mono text-[10px] text-tx-dim leading-relaxed mt-1 line-clamp-4 whitespace-pre-wrap">{previewBody}</pre>
          {previewTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {previewTags.map((t, i) => (
                <span key={i} className="px-tag">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
