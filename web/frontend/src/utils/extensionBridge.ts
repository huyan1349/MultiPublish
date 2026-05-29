import type { PublishPayload, PublishResult } from '../adapters/types';

const EXTENSION_ID = 'cecgmmphokhciflacpegmfpobchjkone';

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
    return { connected: true, version: resp?.version };
  } catch {
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
