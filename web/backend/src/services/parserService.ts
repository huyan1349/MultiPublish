import type { ContentBlock } from '../adapters/PlatformAdapter.js';

export function parseToBlocks(raw: string): ContentBlock[] {
  if (raw.trim().startsWith('<')) {
    return parseHtmlToBlocks(raw);
  }
  return parseMarkdownToBlocks(raw);
}

function parseHtmlToBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const tagRegex = /<(h[23]|p|ul|ol|blockquote|img|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  // Strip wrapper tags, process simple structure
  const cleaned = html.replace(/<\/?(html|body|head|div|span|br|hr|strong|em|code|pre|a)[^>]*>/gi, '');
  // Match block-level elements
  const blockRegex = /<(h[23])[^>]*>(.*?)<\/\1>|<(p)[^>]*>(.*?)<\/\3>|<(ul)[^>]*>(.*?)<\/\4>|<(ol)[^>]*>(.*?)<\/\5>|<(blockquote)[^>]*>(.*?)<\/\6>|<(img)[^>]*src="([^"]*)"[^>]*\/?>/gi;

  let match;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    if (match[1]) {
      // heading
      blocks.push({ type: 'heading', level: match[1] === 'h3' ? 3 : 2, text: stripHtml(match[2]).trim() });
    } else if (match[3]) {
      // paragraph
      const text = stripHtml(match[4]).trim();
      if (text) blocks.push({ type: 'paragraph', text });
    } else if (match[5] || match[7]) {
      // list
      const listHtml = match[6] || match[8] || '';
      const items = listHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi)?.map((li) =>
        stripHtml(li.replace(/<\/?li[^>]*>/gi, '')).trim()
      ).filter(Boolean) || [];
      if (items.length) blocks.push({ type: 'list', items });
    } else if (match[9]) {
      // blockquote
      const text = stripHtml(match[10]).trim();
      if (text) blocks.push({ type: 'quote', text });
    } else if (match[11]) {
      // img
      blocks.push({ type: 'image', url: match[12] });
    }
  }

  if (blocks.length === 0) {
    const text = stripHtml(cleaned).trim();
    if (text) blocks.push({ type: 'paragraph', text });
  }
  return blocks;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

export function parseMarkdownToBlocks(markdown: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading: ## Title or # Title
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Image: ![alt](url) or ![alt](url "caption")
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
    if (imageMatch) {
      blocks.push({
        type: 'image',
        url: imageMatch[2],
        caption: imageMatch[3] || imageMatch[1] || undefined,
      });
      i++;
      continue;
    }

    // Quote: > text
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      continue;
    }

    // Unordered list: - item or * item
    if (line.match(/^[\-\*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\-\*]\s+/)) {
        items.push(lines[i].replace(/^[\-\*]\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Ordered list: 1. item
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Regular paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].match(/^(#{1,3}\s|>\s|[\-\*]\s|\d+\.\s|!\[)/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n').trim() });
    }
  }

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
