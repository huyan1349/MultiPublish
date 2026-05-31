import type { ContentBlock } from './types';

export function parseHtmlToBlocks(html: string): ContentBlock[] {
  const doc = new DOMParser().parseFromString(`<main>${html}</main>`, 'text/html');
  const root = doc.querySelector('main');
  if (!root) return [];

  const blocks: ContentBlock[] = [];

  const pushTextBlock = (type: ContentBlock['type'], text: string, level?: 1 | 2 | 3) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (type === 'heading') blocks.push({ type, level, text: clean });
    else blocks.push({ type, text: clean });
  };

  const walk = (element: Element) => {
    const tag = element.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      pushTextBlock('heading', element.textContent || '', Number(tag.slice(1)) as 1 | 2 | 3);
      return;
    }
    if (tag === 'p') { pushTextBlock('paragraph', element.textContent || ''); return; }
    if (tag === 'blockquote') { pushTextBlock('quote', element.textContent || ''); return; }
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((child) => (child.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (items.length > 0) blocks.push({ type: 'list', items });
      return;
    }
    if (tag === 'img') {
      const img = element as HTMLImageElement;
      if (img.src) blocks.push({ type: 'image', url: img.src, caption: img.alt || undefined });
      return;
    }
    for (const child of Array.from(element.children)) walk(child);
  };

  for (const child of Array.from(root.children)) walk(child);

  const directText = Array.from(root.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join(' ').trim();
  if (blocks.length === 0 && directText) blocks.push({ type: 'paragraph', text: directText });

  return blocks;
}

export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': return b.text || '';
      case 'paragraph': return b.text || '';
      case 'list': return (b.items || []).join('\n');
      case 'quote': return b.text || '';
      case 'image': return b.caption || b.url || '';
      default: return '';
    }
  }).filter(Boolean).join('\n');
}
