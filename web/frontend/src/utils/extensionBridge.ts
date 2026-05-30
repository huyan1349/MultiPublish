import type { PublishPayload, PublishResult } from '../adapters/types';

const EXTENSION_IDS = [
  'cecgmmphokhciflacpegmfpobchjkone',
  'nkbofdgckebmeahmnidbkbjglbfmpfji',
  'bcfbhfbghjoclbjffibjippcecnbmbkl',
];

export interface ExtensionStatus {
  available: boolean;
  version?: string;
  lastChecked: number;
}

let cachedStatus: ExtensionStatus = { available: false, lastChecked: 0 };

let connectedExtId: string | null = null;

export async function publishToPlatform(payload: PublishPayload): Promise<PublishResult> {
  if (!chrome?.runtime?.sendMessage) {
    throw new Error('请在 Chrome 浏览器中打开此页面，并确保已安装 ContentBridge 扩展');
  }
  const extId = connectedExtId || EXTENSION_IDS[0];
  return chrome.runtime.sendMessage(extId, {
    type: 'PUBLISH_TO_PLATFORM',
    payload,
  });
}

export function isExtensionAvailable(): boolean {
  return !!(chrome?.runtime?.sendMessage);
}

async function tryHealthCheck(extId: string): Promise<{ connected: boolean; version?: string }> {
  try {
    if (!chrome?.runtime?.sendMessage) return { connected: false };
    const resp = await chrome.runtime.sendMessage(extId, { type: 'HEALTH_CHECK' });
    return { connected: true, version: resp?.version };
  } catch {
    return { connected: false };
  }
}

export async function checkExtensionHealth(): Promise<{ connected: boolean; version?: string }> {
  for (const extId of EXTENSION_IDS) {
    const result = await tryHealthCheck(extId);
    if (result.connected) {
      connectedExtId = extId;
      cachedStatus = { available: true, version: result.version, lastChecked: Date.now() };
      return result;
    }
  }
  connectedExtId = null;
  cachedStatus = { available: false, lastChecked: Date.now() };
  return { connected: false };
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
