import type { ContentBlock } from '../adapters/PlatformAdapter.js';

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
