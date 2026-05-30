import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, Wand2, RefreshCw, Check, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { beautifyContentForPlatform } from '../../services/deepseek';
import type { BeautifiedContent } from '../../stores/contentStore';
import type { PlatformType } from '../../adapters/types';

const platformMeta: Record<string, { color: string; label: string }> = {
  wechat:      { color: '#07C160', label: 'WC' },
  zhihu:       { color: '#0066FF', label: 'ZH' },
  bilibili:    { color: '#FB7299', label: 'BL' },
  xiaohongshu: { color: '#FF2442', label: 'XH' },
};

const levelIcon: Record<string, typeof XCircle> = { error: XCircle, warning: AlertTriangle, info: Info };
const levelColor: Record<string, string> = { error: 'text-dot-red', warning: 'text-amber-500', info: 'text-tx-dim' };

interface PlatformCardProps {
  platform: PlatformType;
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
  draftTitle: string;
  draftHtmlContent: string;
  beautifiedContent?: BeautifiedContent;
  onBeautifyStart: () => void;
  onBeautifyComplete: (result: BeautifiedContent) => void;
  onBeautifyError: (error: string) => void;
  onApplyBeautified: () => void;
}

export default function PlatformCard({
  platform, platformName, selected, onToggle,
  titleCount, titleMax, bodyCount, bodyMax, tagCount, tagMax,
  messages, previewBody, previewTags, draftTitle, draftHtmlContent,
  beautifiedContent, onBeautifyStart, onBeautifyComplete, onBeautifyError, onApplyBeautified,
}: PlatformCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [beautifying, setBeautifying] = useState(false);
  const [hasBeautified, setHasBeautified] = useState(false);
  const [expandHeight, setExpandHeight] = useState(0);
  const expandRef = useRef<HTMLDivElement>(null);
  const meta = platformMeta[platform] || platformMeta.wechat;

  useEffect(() => {
    if (expanded && expandRef.current) {
      setExpandHeight(expandRef.current.scrollHeight);
    }
  }, [expanded, previewBody, previewTags, beautifiedContent]);

  const handleBeautify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (beautifying) return;
    setBeautifying(true);
    onBeautifyStart();
    try {
      const draftTags = previewTags.length > 0 ? previewTags : ['内容创作'];
      const result = await beautifyContentForPlatform({
        platform,
        platformName,
        title: draftTitle || '未命名',
        htmlContent: draftHtmlContent || previewBody,
        tags: draftTags,
      });
      onBeautifyComplete(result);
      setExpanded(true);
      setHasBeautified(true);
    } catch (err) {
      onBeautifyError(err instanceof Error ? err.message : '美化失败');
    } finally {
      setBeautifying(false);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyBeautified();
  };

  return (
    <div
      className={`border transition-[border-color,opacity,box-shadow] duration-200 cursor-pointer overflow-hidden
        ${selected
          ? 'bg-white border-px-border hover:border-tx-mute'
          : 'bg-px-surface border-px-border-subtle opacity-40 hover:opacity-70'}`}
      style={{ borderRadius: 0 }}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${platformName} 平台卡片`}
    >
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="px-dot" style={{ backgroundColor: meta.color }} />
          <span className="font-mono font-bold text-[10px] text-tx tracking-wide">{platformName.toUpperCase()}</span>
          <span className="font-mono text-[8px] text-tx-faint">{meta.label}</span>
          {beautifiedContent && (
            <span
              className="font-mono text-[7px] font-bold px-1.5 py-0.5 tracking-wider"
              style={{ backgroundColor: meta.color + '18', color: meta.color }}
            >
              BEAUTIFIED
            </span>
          )}
          {selected && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleBeautify}
                disabled={beautifying}
                className={`px-btn-ghost text-[8px] px-1.5 py-1 transition-[background-color,color,box-shadow] duration-200
                  ${beautifying ? 'opacity-60' : ''}
                  ${hasBeautified ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.08)]' : ''}`}
                title="AI 美化"
                aria-label="AI 美化"
              >
                {beautifying ? <RefreshCw size={10} className="animate-spin" /> : <Wand2 size={10} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="text-tx-faint hover:text-tx-dim transition-[color] duration-200 p-0.5"
                aria-label={expanded ? '收起详情' : '展开详情'}
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
                <span className={`tabular-nums ${titleCount > titleMax ? 'text-dot-red' : 'text-tx-faint'}`}>
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
              <span className="text-tx-faint tabular-nums">
                {bodyCount.toLocaleString()}{bodyMax < Infinity ? `/${bodyMax.toLocaleString()}` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-tx-faint">TAGS</span>
              <span className={`tabular-nums ${tagCount > tagMax ? 'text-dot-red' : 'text-tx-faint'}`}>
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

      {selected && (
        <div
          style={{
            maxHeight: expanded ? expandHeight : 0,
            opacity: expanded ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.3s ease, opacity 0.2s ease',
          }}
        >
          <div ref={expandRef} className="border-t border-px-border-subtle px-4 py-3 bg-px-bg">
            {beautifiedContent && (
              <div className="mb-3 pb-3 border-b border-px-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={9} style={{ color: meta.color }} />
                    <span className="font-mono text-[9px] font-bold" style={{ color: meta.color }}>AI BEAUTIFIED</span>
                  </div>
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1 font-mono text-[8px] font-bold px-2 py-1 text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: meta.color }}
                  >
                    <Check size={9} /> APPLY
                  </button>
                </div>
                {beautifiedContent.title && (
                  <p className="font-mono text-[10px] text-tx font-bold mb-1">{beautifiedContent.title}</p>
                )}
                <pre className="font-mono text-[10px] text-tx-dim leading-relaxed line-clamp-6 whitespace-pre-wrap">{beautifiedContent.htmlBody}</pre>
                {beautifiedContent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {beautifiedContent.tags.map((t, i) => (
                      <span key={i} className="px-tag" style={{ backgroundColor: meta.color + '12', color: meta.color }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="font-mono text-[9px] text-tx-faint">ORIGINAL</span>
            <pre className="font-mono text-[10px] text-tx-dim leading-relaxed mt-1 line-clamp-4 whitespace-pre-wrap">{previewBody}</pre>
            {previewTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {previewTags.map((t, i) => (
                  <span key={i} className="px-tag">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
