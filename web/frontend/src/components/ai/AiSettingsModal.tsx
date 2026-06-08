/**
 * AI 供应商设置弹窗
 *
 * 关键设计：
 * 1. 表单状态为 React 本地 state，绝不进入 useAiConfig store，
 *    因此 "测试连接" 时填入的 key 不会落盘到 localStorage（除非用户勾选"记住 API Key"）。
 * 2. ESC 关闭、点击遮罩关闭。
 * 3. 用户须自行提供 API Key；"测试连接" 仅在用户填入后可用。
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertCircle, Loader2, Eye, EyeOff, Sparkles, Trash2, ExternalLink } from 'lucide-react';
import {
  PROVIDERS,
  getProvider,
  type ProviderId,
  type ProviderConfig,
} from '../../config/aiProviders';
import { useAiConfig } from '../../hooks/useAiConfig';
import { ping } from '../../services/aiClient';

interface AiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  providerId: ProviderId | '';
  model: string;
  apiKey: string;
  rememberKey: boolean;
}

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; latencyMs: number; model: string }
  | { kind: 'error'; message: string };

export default function AiSettingsModal({ open, onClose }: AiSettingsModalProps) {
  const config = useAiConfig();

  // 表单本地 state —— 不进 store，不进 localStorage
  const [form, setForm] = useState<FormState>({
    providerId: config.providerId ?? '',
    model: config.model ?? '',
    apiKey: '', // 永远不预填；用户输入或测试才填
    rememberKey: config.rememberKey,
  });
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({ kind: 'idle' });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // 当前选中供应商
  const provider = useMemo<ProviderConfig | undefined>(
    () => (form.providerId ? getProvider(form.providerId) : undefined),
    [form.providerId],
  );

  // 当外部 config 变化时（如其他标签页修改了），同步初始值
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        providerId: config.providerId ?? '',
        model: config.model ?? '',
        rememberKey: config.rememberKey,
        // apiKey 不从 config 拉取到表单（避免任何意外的双向同步）
      }));
      setTestStatus({ kind: 'idle' });
      setSavedNotice(null);
    }
  }, [open, config.providerId, config.model, config.rememberKey]);

  // 切换供应商时，若 model 不在新供应商列表内，重置
  useEffect(() => {
    if (!provider) return;
    if (provider.enabled && provider.models.length > 0) {
      const modelValid = provider.models.some((m) => m.id === form.model);
      if (!modelValid) {
        setForm((f) => ({ ...f, model: provider.defaultModel }));
      }
    }
  }, [provider, form.model]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const runTest = useCallback(
    async (overrides?: { providerId?: ProviderId; model?: string; apiKey?: string }) => {
      const providerId = overrides?.providerId ?? (form.providerId as ProviderId);
      const model = overrides?.model ?? form.model;
      const apiKey = overrides?.apiKey ?? form.apiKey.trim();

      if (!providerId || !model || !apiKey) {
        setTestStatus({ kind: 'error', message: '请先选择供应商、模型并填写 API Key' });
        return;
      }

      setTestStatus({ kind: 'testing' });
      const result = await ping({ provider: providerId, model, apiKey });

      if (result.ok) {
        setTestStatus({ kind: 'ok', latencyMs: result.latencyMs ?? 0, model });
      } else {
        setTestStatus({ kind: 'error', message: result.error || '测连通失败' });
      }
    },
    [form.providerId, form.model, form.apiKey],
  );

  const handleSave = useCallback(() => {
    if (!form.providerId || !form.model) {
      setTestStatus({ kind: 'error', message: '请先选择供应商和模型' });
      return;
    }
    if (!form.apiKey.trim()) {
      setTestStatus({
        kind: 'error',
        message: '请填写你自己的 API Key',
      });
      return;
    }
    // 如果 rememberKey=false，本次不持久化 key（仅在内存中用本次会话）
    config.setProvider(form.providerId as ProviderId);
    config.setModel(form.model);
    // 两种情况下都把 apiKey 放进 store（in-memory 总是可用）；
    // rememberKey=false 时 persist 不会把它写进 localStorage
    config.setApiKey(form.apiKey);
    config.setRememberKey(form.rememberKey);
    setSavedNotice('配置已保存');
    setTestStatus({ kind: 'ok', latencyMs: 0, model: form.model });
    setTimeout(() => {
      setSavedNotice(null);
      onClose();
    }, 600);
  }, [form, config, onClose]);

  const handleClear = useCallback(() => {
    config.clear();
    setForm({ providerId: '', model: '', apiKey: '', rememberKey: true });
    setTestStatus({ kind: 'idle' });
    setSavedNotice('已清除所有配置');
    setTimeout(() => setSavedNotice(null), 2000);
  }, [config]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 遮罩：使用纯色蒙层 + 透明度，去掉 backdrop-blur
          （Windows 上 backdrop-filter 软件渲染开销巨大，容易卡顿） */}
      <div
        className="absolute inset-0 bg-[rgba(20,18,14,0.55)]"
        style={{ contain: 'strict' }}
      />

      {/* 弹窗本体 */}
      <div
        className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[24px] border border-[rgba(49,56,45,0.1)] bg-[rgba(252,250,245,0.98)] p-6 md:p-7 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-faint)] hover:bg-[rgba(49,56,45,0.06)] hover:text-[var(--ink)] transition"
          aria-label="关闭"
        >
          <X size={16} />
        </button>

        <div className="px-label mb-2">AI 供应商</div>
        <h2 className="font-['Cormorant_Garamond'] text-[32px] leading-[1.05] tracking-[-0.04em] text-[var(--ink)]">
          选择你的 AI 服务
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-[var(--ink-soft)]">
          自行选择供应商、模型并填入 API Key。Key 仅保存在本地浏览器，关闭后不会发送至我们的服务器。
        </p>

        {/* Provider 选择 */}
        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-soft)]">供应商</span>
            <select
              value={form.providerId}
              onChange={(e) => {
                const id = e.target.value as ProviderId | '';
                const p = id ? getProvider(id) : undefined;
                setForm((f) => ({
                  ...f,
                  providerId: id as ProviderId,
                  model: p?.defaultModel ?? '',
                }));
              }}
              className="mt-2 w-full px-3 py-2.5 rounded-xl border border-[rgba(49,56,45,0.14)] bg-white text-[14px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50"
            >
              <option value="">— 请选择 —</option>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.enabled}>
                  {p.label}{!p.enabled ? ' (即将支持)' : ''}
                </option>
              ))}
            </select>
          </label>

          {provider?.enabled && (
            <label className="block">
              <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-soft)]">模型</span>
              <select
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className="mt-2 w-full px-3 py-2.5 rounded-xl border border-[rgba(49,56,45,0.14)] bg-white text-[14px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50"
              >
                {provider.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* API Key 输入 */}
          {provider?.enabled && (
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-[0.16em] text-[var(--ink-soft)]">API Key</span>
                {provider.docsUrl && (
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[var(--ink-faint)] hover:text-[var(--accent-deep)] transition"
                  >
                    获取 Key <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="relative mt-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder={`输入 ${provider.label} API Key`}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-[rgba(49,56,45,0.14)] bg-white text-[14px] text-[var(--ink)] font-mono placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--accent)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-faint)] hover:bg-[rgba(49,56,45,0.06)] hover:text-[var(--ink)]"
                  aria-label={showKey ? '隐藏' : '显示'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>
          )}

          {/* 记住 Key 复选框 */}
          {provider?.enabled && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.rememberKey}
                onChange={(e) => setForm((f) => ({ ...f, rememberKey: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-[rgba(49,56,45,0.2)] accent-[var(--accent)]"
              />
              <span className="text-[12px] leading-5 text-[var(--ink-soft)]">
                记住 API Key（保存到本浏览器 localStorage；不勾选则仅当前会话有效）
              </span>
            </label>
          )}

          {provider?.hint && (
            <p className="text-[12px] leading-5 text-[var(--ink-faint)]">{provider.hint}</p>
          )}
        </div>

        {/* 测试区 */}
        <div className="mt-5 rounded-[18px] border border-[rgba(49,56,45,0.1)] bg-[rgba(255,255,255,0.72)] p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runTest()}
              disabled={!form.providerId || !form.model || !form.apiKey || testStatus.kind === 'testing'}
              className="px-btn-secondary text-[12px] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {testStatus.kind === 'testing' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              测试连接
            </button>
          </div>

          {testStatus.kind === 'ok' && (
            <div className="flex items-center gap-2 text-[12px] text-green-700">
              <Check size={14} />
              <span>连通成功 · 延迟 {testStatus.latencyMs}ms · 模型 {testStatus.model}</span>
            </div>
          )}
          {testStatus.kind === 'error' && (
            <div className="flex items-start gap-2 text-[12px] text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-all">{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* 操作区 */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-btn-danger text-[12px] inline-flex items-center gap-1.5"
          >
            <Trash2 size={12} />
            清除已保存配置
          </button>
          <div className="flex items-center gap-2">
            {savedNotice && <span className="text-[12px] text-green-700">{savedNotice}</span>}
            <button
              type="button"
              onClick={onClose}
              className="px-btn-secondary text-[13px]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.providerId || !form.model}
              className="px-btn-primary text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
