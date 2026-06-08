/**
 * AI 供应商连接状态徽标
 *
 * 显示在 AiAssistantPanel 头部。点击打开 AiSettingsModal。
 * 状态：
 *   - 未配置：灰色 "未配置"
 *   - 已配置：显示 provider.label + model
 *   - 测试中：黄色 "测试中"
 *   - 错误：红色 "连接失败"
 *   - 成功：绿色（带时间戳）
 */

import { memo, useState, useMemo } from 'react';
import { Check, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useAiConfig } from '../../hooks/useAiConfig';
import { getProvider } from '../../config/aiProviders';
import AiSettingsModal from './AiSettingsModal';

interface ConnectionStatusBadgeProps {
  className?: string;
}

function ConnectionStatusBadgeImpl({ className = '' }: ConnectionStatusBadgeProps) {
  // 用 selector 订阅，避免整个 store 变化都触发重渲染
  const providerId = useAiConfig((s) => s.providerId);
  const model = useAiConfig((s) => s.model);
  const status = useAiConfig((s) => s.status);
  const lastError = useAiConfig((s) => s.lastError);
  const lastTestedAt = useAiConfig((s) => s.lastTestedAt);
  const [open, setOpen] = useState(false);

  // 派生数据用 useMemo 缓存
  const { provider, badgeClass, Icon, label } = useMemo(() => {
    const p = providerId ? getProvider(providerId) : undefined;
    let cls = 'bg-[rgba(49,56,45,0.06)] border-[rgba(49,56,45,0.12)] text-[var(--ink-soft)]';
    let icon: typeof Settings = Settings;
    let txt = '未配置 AI 供应商';

    if (p && model) {
      if (status === 'testing') {
        cls = 'bg-amber-50 border-amber-200 text-amber-700';
        icon = Loader2;
        txt = `${p.label} · 测试中…`;
      } else if (status === 'ok') {
        cls = 'bg-green-50 border-green-200 text-green-700';
        icon = Check;
        const ago = lastTestedAt ? Math.max(1, Math.round((Date.now() - lastTestedAt) / 1000)) : null;
        txt = `${p.label} · ${model}${ago ? ` · ${ago}s前` : ''}`;
      } else if (status === 'error') {
        cls = 'bg-red-50 border-red-200 text-red-700';
        icon = AlertCircle;
        txt = `连接失败 · ${lastError?.slice(0, 30) || '请检查 Key'}`;
      } else {
        cls = 'bg-[rgba(0,0,0,0.02)] border-[rgba(49,56,45,0.14)] text-[var(--ink)]';
        icon = Check;
        txt = `${p.label} · ${model}`;
      }
    }
    return { provider: p, badgeClass: cls, Icon: icon, label: txt };
  }, [providerId, model, status, lastError, lastTestedAt]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition hover:opacity-80 ${badgeClass} ${className}`}
        title={lastError || '点击配置 AI 供应商'}
      >
        <Icon size={11} className={status === 'testing' ? 'animate-spin' : ''} />
        <span className="font-['IBM_Plex_Mono'] tracking-wide">{label}</span>
      </button>
      <AiSettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default memo(ConnectionStatusBadgeImpl);
