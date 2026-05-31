import type { PlatformType } from '../../shared/types';
import wechatIcon from './icon-wechat.png';
import zhihuIcon from './icon-zhihu.png';
import bilibiliIcon from './icon-bilibili.png';
import xiaohongshuIcon from './icon-xiaohongshu.png';

const ICONS: Record<PlatformType, string> = {
  wechat: wechatIcon,
  zhihu: zhihuIcon,
  bilibili: bilibiliIcon,
  xiaohongshu: xiaohongshuIcon,
  weibo: xiaohongshuIcon, // TODO: replace with weibo icon
};

interface Props {
  platform: PlatformType;
  size?: number;
}

export default function PlatformIcon({ platform, size = 40 }: Props) {
  const src = ICONS[platform];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={platform}
      width={size}
      height={size}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
