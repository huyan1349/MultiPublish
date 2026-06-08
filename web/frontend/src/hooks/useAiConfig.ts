import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProviderId } from '../config/aiProviders';
import { getProvider, getDefaultModelFor, PROVIDERS } from '../config/aiProviders';

const STORAGE_KEY = 'multipublish_ai_config_v1';

export type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'error';

export interface AiConfigState {
  /** 当前选中的供应商 id（可空） */
  providerId: ProviderId | null;
  /** 当前选中的模型 id（可空） */
  model: string | null;
  /** API key（仅在 rememberKey=true 时落盘；未开启时只在内存中保留当前会话） */
  apiKey: string | null;
  /** 是否将 API key 持久化到 localStorage（默认 true，简化使用） */
  rememberKey: boolean;
  /** 运行时连接状态（不入 localStorage） */
  status: ConnectionStatus;
  /** 上次测试时间（不入 localStorage） */
  lastTestedAt: number | null;
  /** 上次错误信息（不入 localStorage） */
  lastError: string | null;
  /** 上次测试成功的延迟（ms） */
  lastLatencyMs: number | null;

  setProvider: (id: ProviderId) => void;
  setModel: (model: string) => void;
  setApiKey: (key: string) => void;
  setRememberKey: (remember: boolean) => void;
  clear: () => void;
  setStatus: (status: ConnectionStatus, error?: string | null, latencyMs?: number | null) => void;
}

/**
 * Zustand store 用于管理 AI 供应商配置。
 * - providerId / model 始终持久化
 * - apiKey 仅在 rememberKey=true 时持久化；未勾选则仅在内存中保存
 * - status / lastTestedAt / lastError 不入 localStorage（运行时态）
 */
export const useAiConfig = create<AiConfigState>()(
  persist(
    (set, get) => ({
      providerId: null,
      model: null,
      apiKey: null,
      rememberKey: true,
      status: 'idle',
      lastTestedAt: null,
      lastError: null,
      lastLatencyMs: null,

      setProvider: (id) => {
        const provider = getProvider(id);
        if (!provider || !provider.enabled) return;
        const defaultModel = provider.defaultModel;
        // 切换供应商时保留 apiKey（可能兼容），但重置为该供应商的默认模型
        set({ providerId: id, model: defaultModel, status: 'idle', lastError: null });
      },

      setModel: (model) => {
        set({ model, status: 'idle', lastError: null });
      },

      setApiKey: (key) => {
        const trimmed = key.trim();
        const { rememberKey } = get();
        set({
          apiKey: trimmed || null,
          // rememberKey=true 时由 persist 写入；否则仅在内存保留
          ...(rememberKey ? {} : {}),
          status: 'idle',
          lastError: null,
        });
      },

      setRememberKey: (remember) => {
        const { apiKey } = get();
        set({ rememberKey: remember });
        // 当用户从 false → true 时，已有内存中的 key 应立即落盘
        if (remember && apiKey) {
          // 触发 persist 写入：通过 setState 制造一次更新
          set({ apiKey });
        }
        // 当用户从 true → false 时，清理已落盘的 key
        if (!remember) {
          set({ apiKey });
        }
      },

      clear: () => {
        set({
          providerId: null,
          model: null,
          apiKey: null,
          rememberKey: true,
          status: 'idle',
          lastTestedAt: null,
          lastError: null,
          lastLatencyMs: null,
        });
      },

      setStatus: (status, error = null, latencyMs = null) => {
        set({
          status,
          lastError: error,
          lastLatencyMs: latencyMs,
          lastTestedAt: status === 'ok' || status === 'error' ? Date.now() : get().lastTestedAt,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 仅持久化业务字段；运行时态不入盘
      partialize: (state) => ({
        providerId: state.providerId,
        model: state.model,
        apiKey: state.rememberKey ? state.apiKey : null,
        rememberKey: state.rememberKey,
      }),
      // 反序列化后校验 provider 是否仍启用
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.providerId) {
          const provider = getProvider(state.providerId);
          if (!provider || !provider.enabled) {
            state.providerId = null;
            state.model = null;
            return;
          }
          // 校验 model 是否仍存在于该 provider
          if (state.model && !provider.models.some((m) => m.id === state.model)) {
            state.model = provider.defaultModel;
          }
        }
      },
    },
  ),
);

/** 选择器：返回当前激活的完整配置（包含 ProviderConfig + apiKey） */
export function selectActiveConfig() {
  const { providerId, model, apiKey } = useAiConfig.getState();
  if (!providerId || !model) return null;
  const provider = getProvider(providerId);
  if (!provider || !provider.enabled) return null;
  return { provider, model, apiKey: apiKey || '' };
}

/** 检查是否已完整配置可用（用于按钮 disabled） */
export function isAiConfigured(): boolean {
  const { providerId, model, apiKey } = useAiConfig.getState();
  return !!(providerId && model && apiKey);
}

/** 返回所有可用 provider 列表（前端展示用） */
export function listProviders() {
  return PROVIDERS;
}

export { getDefaultModelFor };
