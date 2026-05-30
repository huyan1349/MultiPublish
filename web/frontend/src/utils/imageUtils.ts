import type { ImagePayload } from '../adapters/types';
import { getResolvedDataUrl, waitForDataUrls } from '../components/editor/TiptapEditor';

export function extractImageSrcs(html: string): string[] {
  const srcs: string[] = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('img').forEach((img) => {
    const s = img.getAttribute('src');
    if (s) srcs.push(s);
  });
  return [...new Set(srcs)];
}

export async function convertSrcToDataUrl(src: string): Promise<string | null> {
  if (src.startsWith('data:')) return src;
  if (src.startsWith('blob:')) {
    await waitForDataUrls([src]);
    return getResolvedDataUrl(src) || null;
  }
  return src;
}

export async function buildImagePayloads(
  htmlContent: string,
  coverImage: string,
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];
  if (coverImage) {
    const dataUrl = await convertSrcToDataUrl(coverImage);
    if (dataUrl && dataUrl.startsWith('data:')) {
      images.push({ id: 'cover', dataUrl, filename: 'cover.png', mimeType: dataUrl.match(/data:(image\/[^;]*);/)?.[1] || 'image/png' });
    }
  }
  const srcs = extractImageSrcs(htmlContent);
  for (let i = 0; i < srcs.length; i++) {
    if (srcs[i] === coverImage) continue;
    const dataUrl = await convertSrcToDataUrl(srcs[i]);
    if (dataUrl && dataUrl.startsWith('data:')) {
      images.push({ id: `img_${i}`, dataUrl, filename: `image_${i}.png`, mimeType: dataUrl.match(/data:(image\/[^;]*);/)?.[1] || 'image/png' });
    }
  }
  return images;
}
