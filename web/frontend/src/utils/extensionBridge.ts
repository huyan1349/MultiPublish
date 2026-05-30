import type { PublishPayload, PublishResult } from '../adapters/types';

const EXTENSION_ID = 'cecgmmphokhciflacpegmfpobchjkone';

export interface ExtensionStatus {
  available: boolean;
  version?: string;
  lastChecked: number;
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
