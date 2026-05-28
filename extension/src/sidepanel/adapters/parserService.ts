import type { ContentBlock } from './PlatformAdapter.js';

export function parseMarkdownToBlocks(markdown: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length as 1|2|3, text: headingMatch[2].trim() });
      i++; continue;
    }

    if (line.startsWith('> ')) {
      const lines2: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) { lines2.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ type: 'quote', text: lines2.join('\n') });
      continue;
    }

    if (line.match(/^[\-\*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\-\*]\s+/)) { items.push(lines[i].replace(/^[\-\*]\s+/, '').trim()); i++; }
      blocks.push({ type: 'list', items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^(#{1,3}\s|>\s|[\-\*]\s)/)) { paraLines.push(lines[i]); i++; }
    if (paraLines.length > 0) blocks.push({ type: 'paragraph', text: paraLines.join('\n').trim() });
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
