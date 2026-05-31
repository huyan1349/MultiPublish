import type { ImagePayload } from '../adapters/types';
import { getResolvedDataUrl, waitForDataUrls } from '../components/editor/TiptapEditor';

export function extractImageSrcs(html: string): string[] {
  const srcs: string[] = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('img').forEach((img) => {
    const s = img.getAttribute('src');
    if (s) srcs.push(s);
  });
  const mdRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  for (const m of html.matchAll(mdRe)) {
    if (m[2] && !srcs.includes(m[2])) srcs.push(m[2]);
  }
  return [...new Set(srcs)];
}

export async function convertSrcToDataUrl(src: string): Promise<string | null> {
  if (src.startsWith('data:')) return src;
  if (src.startsWith('blob:')) {
    await waitForDataUrls([src]);
    return getResolvedDataUrl(src) || null;
  }
  return null;
}

export function replaceBlobUrlsWithData(text: string): string {
  return text.replace(/blob:[\w-]+:\/\/[^)\s"']+/g, (match) => {
    const dataUrl = getResolvedDataUrl(match);
    return dataUrl || match;
  });
}

export function stripDataUrlImages(body: string): string {
  let result = body;
  result = stripHtmlDataUrlImgs(result);
  result = stripMarkdownDataUrlImgs(result);
  return result;
}

function stripHtmlDataUrlImgs(html: string): string {
  return html.replace(/<img[^>]*src\s*=\s*["']data:[^"']*["'][^>]*\/?>/gi, '');
}

function stripMarkdownDataUrlImgs(text: string): string {
  let result = text;
  let searchFrom = 0;
  let safety = 0;
  while (safety < 500) {
    const start = result.indexOf('![', searchFrom);
    if (start === -1) break;
    const bracketEnd = result.indexOf('](', start);
    if (bracketEnd === -1) { searchFrom = start + 2; safety++; continue; }
    const urlStart = bracketEnd + 2;
    const parenEnd = result.indexOf(')', urlStart);
    if (parenEnd === -1) { searchFrom = start + 2; safety++; continue; }
    const url = result.slice(urlStart, parenEnd);
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      result = result.slice(0, start) + result.slice(parenEnd + 1);
      searchFrom = start;
    } else {
      searchFrom = parenEnd + 1;
    }
    safety++;
  }
  return result;
}

export function markdownBodyToHtml(body: string): string {
  if (!body) return '';
  if (isHtmlBody(body)) return body;
  let result = body;
  result = convertMarkdownImagesToHtml(result);
  result = convertMarkdownHeadings(result);
  result = convertMarkdownLists(result);
  result = convertMarkdownQuotes(result);
  result = convertMarkdownParagraphs(result);
  return result;
}

function isHtmlBody(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.startsWith('<')) return true;
  const htmlTags = /<(p|h[1-6]|div|ul|ol|li|blockquote|img|table|section|article)\b/i;
  if (htmlTags.test(trimmed)) return true;
  return false;
}

function convertMarkdownImagesToHtml(text: string): string {
  const parts: string[] = [];
  let searchFrom = 0;
  let safety = 0;
  while (safety < 100) {
    const bang = text.indexOf('![', searchFrom);
    if (bang === -1) {
      parts.push(text.slice(searchFrom));
      break;
    }
    parts.push(text.slice(searchFrom, bang));
    const bracketEnd = text.indexOf('](', bang);
    if (bracketEnd === -1) {
      parts.push(text.slice(bang));
      break;
    }
    const alt = text.slice(bang + 2, bracketEnd);
    const urlStart = bracketEnd + 2;
    const parenEnd = text.indexOf(')', urlStart);
    if (parenEnd === -1) {
      parts.push(text.slice(bang));
      break;
    }
    const url = text.slice(urlStart, parenEnd);
    parts.push(`<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" style="max-width:100%;border-radius:4px;" />`);
    searchFrom = parenEnd + 1;
    safety++;
  }
  return parts.join('');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertMarkdownHeadings(text: string): string {
  return text.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes: string, content: string) => {
    const level = Math.min(hashes.length, 6);
    return `<h${level} style="font-weight:bold;margin:16px 0 8px;">${content}</h${level}>`;
  });
}

function convertMarkdownLists(text: string): string {
  return text.replace(/((?:^- .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map((line: string) => line.replace(/^- /, '').trim());
    return `<ul style="padding-left:20px;margin:8px 0;">${items.map((item: string) => `<li>${item}</li>`).join('')}</ul>`;
  });
}

function convertMarkdownQuotes(text: string): string {
  return text.replace(/^>\s+(.+)$/gm, '<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#666;margin:8px 0;">$1</blockquote>');
}

function convertMarkdownParagraphs(text: string): string {
  return text.replace(/\n{2,}/g, '<br/><br/>');
}

export async function resolveBodyImages(body: string): Promise<string> {
  const blobRe = /blob:[\w-]+:\/\/[^)\s"']+/g;
  const blobUrls = new Set<string>();
  for (const m of body.matchAll(blobRe)) blobUrls.add(m[0]);
  if (blobUrls.size > 0) {
    await waitForDataUrls([...blobUrls]);
  }
  return replaceBlobUrlsWithData(body);
}

export async function buildImagePayloads(
  bodyHtml: string,
  coverImage: string,
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];

  if (coverImage) {
    const dataUrl = await convertSrcToDataUrl(coverImage);
    if (dataUrl && dataUrl.startsWith('data:')) {
      images.push({
        id: 'cover',
        dataUrl,
        filename: 'cover.png',
        mimeType: dataUrl.match(/data:(image\/[^;]*);/)?.[1] || 'image/png',
      });
    }
  }

  const srcs = extractImageSrcs(bodyHtml);
  for (let i = 0; i < srcs.length; i++) {
    if (srcs[i] === coverImage) continue;
    const dataUrl = await convertSrcToDataUrl(srcs[i]);
    if (dataUrl && dataUrl.startsWith('data:')) {
      const ext = dataUrl.match(/data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);/)?.[1] || 'png';
      images.push({
        id: `img_${i}`,
        dataUrl,
        filename: `image_${i}.${ext === 'jpeg' ? 'jpg' : ext === 'svg+xml' ? 'svg' : ext}`,
        mimeType: dataUrl.match(/data:(image\/[^;]*);/)?.[1] || 'image/png',
      });
    }
  }

  return images;
}
