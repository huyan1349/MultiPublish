import type { PlatformAdapter, PlatformType } from './PlatformAdapter.js';
import { wechatAdapter } from './wechat/WechatAdapter.js';
import { zhihuAdapter } from './zhihu/ZhihuAdapter.js';
import { bilibiliAdapter } from './bilibili/BilibiliAdapter.js';
import { xiaohongshuAdapter } from './xiaohongshu/XiaohongshuAdapter.js';

const adapterMap = new Map<PlatformType, PlatformAdapter>();

adapterMap.set('wechat', wechatAdapter);
adapterMap.set('zhihu', zhihuAdapter);
adapterMap.set('bilibili', bilibiliAdapter);
adapterMap.set('xiaohongshu', xiaohongshuAdapter);

export function getAdapter(platform: PlatformType): PlatformAdapter {
  const adapter = adapterMap.get(platform);
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter;
}

export function listAdapters(): PlatformAdapter[] {
  return Array.from(adapterMap.values());
}

export function getPlatformList() {
  return listAdapters().map((a) => ({
    id: a.platform,
    name: a.displayName,
  }));
}
