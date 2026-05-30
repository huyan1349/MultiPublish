import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, RefreshCw, Check, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { beautifyContentForPlatform } from '../../services/deepseek';
import type { BeautifiedContent } from '../../stores/contentStore';
import type { PlatformType } from '../../adapters/types';

const platformMeta: Record<string, { color: string; soft: string; deep: string; label: string; hex: string; hexDeep: string }> = {
  wechat:      { color: 'var(--platform-wechat)', soft: 'var(--platform-wechat-soft)', deep: 'var(--platform-wechat-deep)', label: 'WC', hex: '#07C160', hexDeep: '#059a4c' },
  zhihu:       { color: 'var(--platform-zhihu)', soft: 'var(--platform-zhihu-soft)', deep: 'var(--platform-zhihu-deep)', label: 'ZH', hex: '#0066FF', hexDeep: '#0052cc' },
  bilibili:    { color: 'var(--platform-bilibili)', soft: 'var(--platform-bilibili-soft)', deep: 'var(--platform-bilibili-deep)', label: 'BL', hex: '#FB7299', hexDeep: '#e0557a' },
  xiaohongshu: { color: 'var(--platform-xiaohongshu)', soft: 'var(--platform-xiaohongshu-soft)', deep: 'var(--platform-xiaohongshu-deep)', label: 'XH', hex: '#FF2442', hexDeep: '#d91c37' },
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
          : 'border-[rgba(49,56,45,0.1)] bg-[rgba(244,249,243,0.8)]'}`}
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
              style={{ backgroundColor: meta.hex + '14', color: meta.color, border: `1px solid ${meta.hex}22` }}
            >
              已美化
            </span>
          )}
        </div>

        {/* AI Beautify - always visible, main action */}
        <div className="mt-4 space-y-3">
          <button
            onClick={handleBeautify}
            disabled={beautifying}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-[16px] text-white font-medium text-[14px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{
              background: beautifying
                ? `linear-gradient(135deg, ${meta.hex}99, ${meta.hex}cc)`
                : `linear-gradient(135deg, ${meta.color}, ${meta.hex}dd)`,
              boxShadow: beautifying ? 'none' : `0 8px 24px ${meta.hex}30`,
            }}
          >
            {beautifying ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {beautifying ? 'AI 正在美化…' : `AI 智能美化 · ${platformName}风格`}
          </button>

          {/* Status + expand row */}
          <div className="flex items-center justify-between">
            <div className="text-[12px] leading-6 text-[var(--ink-soft)]">
              {statusMessage || 'AI 将自动适配平台风格，优化标题、正文和标签'}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="flex h-9 items-center gap-1 rounded-full border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.6)] px-3 text-[11px] text-[var(--ink-soft)] transition-all duration-200 hover:border-[rgba(49,56,45,0.2)] hover:text-[var(--ink)]"
            >
              {expanded ? '收起预览' : '展开预览'}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {selected && (
          <div className="mt-4 space-y-4">
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

      <div
        style={{
          maxHeight: expanded ? expandHeight : 0,
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.2s ease',
        }}
      >
        <div ref={expandRef} className="border-t border-[rgba(49,56,45,0.12)] bg-[rgba(244,249,243,0.76)] px-5 py-5">
            {beautifiedContent && (
              <div className="mb-5 rounded-[22px] border border-amber-200/60 bg-amber-50/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={11} className="text-amber-600" />
                    <span className="font-['IBM_Plex_Mono'] text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700">AI 美化结果</span>
                    <span className="font-['IBM_Plex_Mono'] text-[7px] uppercase tracking-[0.16em] text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded-full">AI 修改</span>
                  </div>
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: meta.color, boxShadow: `0 12px 24px ${meta.hex}2a` }}
                  >
                    <Check size={9} /> 应用到当前平台
                  </button>
                </div>
                {beautifiedContent.title && (
                  <h3 className="mb-2 font-['Cormorant_Garamond'] text-[24px] leading-[1.1] tracking-[-0.03em] text-amber-800">{beautifiedContent.title}</h3>
                )}
                <div
                  className="text-[13px] leading-7 italic text-amber-900/80 line-clamp-6 [&_strong]:text-amber-950 [&_h3]:not-italic [&_h2]:not-italic [&_h3]:text-[var(--ink)] [&_h2]:text-[var(--ink)]"
                  dangerouslySetInnerHTML={{ __html: beautifiedContent.htmlBody }}
                />
                {beautifiedContent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {beautifiedContent.tags.map((t, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: meta.hex + '14', color: meta.color }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Platform Mock Preview */}
            <div className="flex justify-center">
              <div
                className="w-full rounded-[18px] overflow-hidden border bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                style={{
                  maxWidth: platform === 'wechat' || platform === 'xiaohongshu' ? 420 : '100%',
                  borderColor: `${meta.hex}18`,
                }}
              >
                {/* Mock platform header */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5 border-b"
                  style={{ borderColor: `${meta.hex}10`, backgroundColor: `${meta.hex}05` }}
                >
                  <div
                    className="w-5 h-5 rounded-[6px] flex items-center justify-center text-white text-[8px] font-bold"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label[0]}
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide" style={{ color: meta.color }}>
                    {platformName} 发布效果
                  </span>
                </div>

                {/* Mock content */}
                <div className="p-5">
                  <h2 className="font-['Cormorant_Garamond'] text-[22px] leading-[1.15] tracking-[-0.03em] text-gray-900 mb-3">
                    {draftTitle}
                  </h2>
                  <div
                    className="text-[13px] leading-7 text-gray-800"
                    style={{ wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                  {previewTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4 pt-3" style={{ borderTop: `1px solid ${meta.hex}12` }}>
                      {previewTags.map((t, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${meta.hex}0e`, color: meta.color }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
