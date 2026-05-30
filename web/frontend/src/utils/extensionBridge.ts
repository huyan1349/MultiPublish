import type { PublishPayload, PublishResult } from '../adapters/types';

const EXTENSION_ID = 'cecgmmphokhciflacpegmfpobchjkone';

export interface ExtensionStatus {
  available: boolean;
  version?: string;
  lastChecked: number;
}

export interface ExtensionPublishPayload {
  platform: 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu';
  content: {
    title: string;
    body: string;
    tags?: string[];
    summary?: string;
    coverImage?: string;
  };
  autoLayout?: boolean;
}

export interface ExtensionPublishResult {
  platform: string;
  platformName: string;
  success: boolean;
  message: string;
  error?: string;
}

interface ChromeRuntime {
  sendMessage?(extensionId: string, message: unknown, callback: (response: ExtensionPublishResult) => void): void;
  lastError?: { message: string };
}

interface ChromeNs {
  runtime?: ChromeRuntime;
}

function getChrome(): ChromeNs | null {
  if (typeof chrome !== 'undefined' && chrome.runtime) return chrome as unknown as ChromeNs;
  return null;
}

let cachedStatus: ExtensionStatus = { available: false, lastChecked: 0 };

export async function publishToPlatform(payload: PublishPayload): Promise<PublishResult> {
  if (!chrome?.runtime?.sendMessage) {
    throw new Error('请在 Chrome 浏览器中打开此页面，并确保已安装 ContentBridge 扩展');
  }
  return chrome.runtime.sendMessage(EXTENSION_ID, {
    type: 'PUBLISH_TO_PLATFORM',
    payload,
  });
}

export function isExtensionAvailable(): boolean {
  return !!(chrome?.runtime?.sendMessage);
}

export const isExtensionInstalled = isExtensionAvailable;

export async function checkExtensionHealth(): Promise<{ connected: boolean; version?: string }> {
  try {
    if (!chrome?.runtime?.sendMessage) return { connected: false };
    const resp = await chrome.runtime.sendMessage(EXTENSION_ID, { type: 'HEALTH_CHECK' });
    cachedStatus = { available: true, version: resp?.version, lastChecked: Date.now() };
    return { connected: true, version: resp?.version };
  } catch {
    cachedStatus = { available: false, lastChecked: Date.now() };
    return { connected: false };
  }
}

export async function publishViaExtension(
  payload: ExtensionPublishPayload,
): Promise<ExtensionPublishResult> {
  return new Promise((resolve, reject) => {
    if (!EXTENSION_ID) {
      reject(new Error('未配置扩展 ID，请在设置中填写 Chrome 扩展 ID'));
      return;
    }

    const cr = getChrome();
    if (!cr?.runtime?.sendMessage) {
      reject(new Error('扩展通信失败，请确认 MultiPublish 扩展已安装并启用'));
      return;
    }

    try {
      cr.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'PUBLISH_TO_PLATFORM', ...payload },
        (response: ExtensionPublishResult) => {
          if (cr.runtime?.lastError) {
            reject(new Error(`扩展通信失败: ${cr.runtime.lastError.message}`));
            return;
          }
          resolve(response);
        },
      );
    } catch {
      reject(new Error('扩展通信失败，请确认 MultiPublish 扩展已安装并启用'));
    }
  });
}

export function onExtensionMessage(callback: (msg: { type: string; payload?: unknown }) => void): () => void {
  if (!chrome?.runtime?.onMessage) return () => {};
  const listener = (msg: { type: string; payload?: unknown }) => {
    if (msg.type?.startsWith('CONTENTBRIDGE_')) callback(msg);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

export async function waitForExtension(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const health = await checkExtensionHealth();
    if (health.connected) return true;
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

export function getExtensionStatus(): ExtensionStatus {
  return { ...cachedStatus };
}

export function setExtensionId(id: string) {
  localStorage.setItem('cb_extension_id', id);
}

export function getExtensionId(): string {
  return localStorage.getItem('cb_extension_id') || '';
}
