import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, Wand2, RefreshCw, Check, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { beautifyContentForPlatform } from '../../services/deepseek';
import type { BeautifiedContent } from '../../stores/contentStore';
import type { PlatformType } from '../../adapters/types';

const platformMeta: Record<string, { color: string; soft: string; deep: string; label: string }> = {
  wechat:      { color: 'var(--platform-wechat)', soft: 'var(--platform-wechat-soft)', deep: 'var(--platform-wechat-deep)', label: 'WC' },
  zhihu:       { color: 'var(--platform-zhihu)', soft: 'var(--platform-zhihu-soft)', deep: 'var(--platform-zhihu-deep)', label: 'ZH' },
  bilibili:    { color: 'var(--platform-bilibili)', soft: 'var(--platform-bilibili-soft)', deep: 'var(--platform-bilibili-deep)', label: 'BL' },
  xiaohongshu: { color: 'var(--platform-xiaohongshu)', soft: 'var(--platform-xiaohongshu-soft)', deep: 'var(--platform-xiaohongshu-deep)', label: 'XH' },
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
  status, statusMessage,
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
      className={`cursor-pointer overflow-hidden rounded-[28px] border transition-all duration-200
        ${selected
          ? 'border-[rgba(49,56,45,0.16)] bg-[rgba(255,255,255,0.82)] shadow-[0_18px_32px_rgba(41,48,39,0.08)]'
          : 'border-[rgba(49,56,45,0.1)] bg-[rgba(244,249,243,0.72)] opacity-60 hover:opacity-85'}`}
      onClick={onToggle}
    >
      <div className="p-5">
        <div className="mb-4 flex items-start gap-2.5">
          <div className="px-dot" style={{ backgroundColor: meta.color }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]">{platformName}</span>
              <span className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">{meta.label}</span>
              {status && status !== 'idle' && (
                <span className="rounded-full border border-[rgba(49,56,45,0.12)] px-2 py-1 font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                  {status === 'publishing' ? '发布中' : status === 'success' ? '成功' : status === 'failed' ? '失败' : status}
                </span>
              )}
            </div>
            <p className="mt-2 font-['Cormorant_Garamond'] text-[28px] leading-none tracking-[-0.05em] text-[var(--ink)]">
              {selected ? '这个平台已加入当前发布批次。' : '这个平台暂时不参与本次发布。'}
            </p>
          </div>
          {beautifiedContent && (
            <span
              className="ml-auto rounded-full px-3 py-1 font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.18em]"
              style={{ backgroundColor: meta.color + '14', color: meta.color, border: `1px solid ${meta.color}22` }}
            >
              已美化
            </span>
          )}
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-[22px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.72)] p-4">
              <div>
                <div className="mb-2 flex items-center justify-between font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em]">
                  <span className="text-[var(--ink-faint)]">标题</span>
                  <span className={titleCount > titleMax ? 'text-red-600' : 'text-[var(--ink-faint)]'}>
                    {titleCount}/{titleMax}
                  </span>
                </div>
                <div className="px-progress">
                  <div className="px-progress-bar" style={{
                    width: `${Math.min(100, (titleCount / titleMax) * 100)}%`,
                    backgroundColor: titleCount > titleMax ? '#b94b4b' : meta.color,
                  }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">正文</div>
                  <div className="mt-2 text-[13px] text-[var(--ink-soft)]">
                    {bodyCount.toLocaleString()}{bodyMax < Infinity ? ` / ${bodyMax.toLocaleString()}` : ''}
                  </div>
                </div>
                <div>
                  <div className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">标签</div>
                  <div className={`mt-2 text-[13px] ${tagCount > tagMax ? 'text-red-600' : 'text-[var(--ink-soft)]'}`}>
                    {tagCount}/{tagMax}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[12px] leading-6 text-[var(--ink-soft)]">
                {statusMessage || '先看预览、再做美化，确认后决定它是否参与这次真实发布。'}
              </div>

              <div className="ml-3 flex items-center gap-1">
                <button
                  onClick={handleBeautify}
                  disabled={beautifying}
                  className={`px-btn-ghost h-9 min-h-0 px-3 ${
                    beautifying ? 'opacity-60' : ''
                  }`}
                  title="AI 美化"
                >
                  {beautifying ? <RefreshCw size={11} className="animate-spin" /> : <Wand2 size={11} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[var(--ink-faint)] transition-all duration-200 hover:border-[rgba(49,56,45,0.14)] hover:bg-[rgba(255,255,255,0.6)] hover:text-[var(--ink)]"
                >
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="rounded-[20px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.62)] p-4">
                <div className="mb-2 font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                  校验提示
                </div>
                <div className="space-y-1.5">
                  {messages.map((m, i) => {
                    const Icon = levelIcon[m.level] || Info;
                    return (
                      <p key={i} className={`flex items-center gap-2 text-[12px] leading-6 ${levelColor[m.level] || 'text-[var(--ink-faint)]'}`}>
                        <Icon size={11} /> {m.message}
                      </p>
                    );
                  })}
                </div>
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
          <div ref={expandRef} className="border-t border-[rgba(49,56,45,0.12)] bg-[rgba(244,249,243,0.76)] px-5 py-4">
            {beautifiedContent && (
              <div className="mb-4 rounded-[22px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.82)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={9} style={{ color: meta.color }} />
                    <span className="font-['IBM_Plex_Mono'] text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: meta.color }}>AI 美化结果</span>
                  </div>
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1 rounded-full px-3 py-2 font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: meta.color, boxShadow: `0 12px 24px ${meta.color}2a` }}
                  >
                    <Check size={9} /> 应用
                  </button>
                </div>
                {beautifiedContent.title && (
                  <p className="mb-2 font-['Cormorant_Garamond'] text-[28px] leading-none tracking-[-0.04em] text-[var(--ink)]">{beautifiedContent.title}</p>
                )}
                <pre className="line-clamp-6 whitespace-pre-wrap font-['IBM_Plex_Mono'] text-[10px] leading-7 text-[var(--ink-soft)]">{beautifiedContent.htmlBody}</pre>
                {beautifiedContent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {beautifiedContent.tags.map((t, i) => (
                      <span key={i} className="px-tag" style={{ backgroundColor: meta.color + '12', color: meta.color }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">原始输出</span>
            <pre className="mt-2 line-clamp-4 whitespace-pre-wrap font-['IBM_Plex_Mono'] text-[10px] leading-7 text-[var(--ink-soft)]">{previewBody}</pre>
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
