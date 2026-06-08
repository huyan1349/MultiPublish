import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';

const LIMITS = { maxTitle: 80, maxDesc: 2000, maxTags: 8 };

function makeVideoTitle(title: string): string {
  return title.trim().substring(0, LIMITS.maxTitle);
}

function cleanInlineText(value = ''): string {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`~#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDescription(blocks: StandardContent['blocks']): string {
  const lines = blocks.flatMap((b) => {
    switch (b.type) {
      case 'heading': return cleanInlineText(b.text);
      case 'paragraph': return cleanInlineText(b.text).substring(0, 200);
      case 'list': return (b.items || []).map((item, index) => `${index + 1}. ${cleanInlineText(item)}`);
      case 'quote': return cleanInlineText(b.text).substring(0, 100);
      default: return '';
    }
  }).filter(Boolean);
  return lines.join('\n\n').substring(0, LIMITS.maxDesc);
}

function buildTimeline(blocks: StandardContent['blocks']): string {
  let minute = 0;
  const items: string[] = ['视频时间轴'];
  for (const b of blocks) {
    const mm = String(minute).padStart(2, '0');
    const label = cleanInlineText(b.type === 'heading' ? b.text : (b.text || '').substring(0, 30));
    if (label) items.push(`${mm}:00 ${label}`);
    minute += b.type === 'heading' ? 1 : b.type === 'paragraph' ? 2 : 1;
  }
  return items.join('\n');
}

export const bilibiliAdapter: PlatformAdapter = {
  platform: 'bilibili',
  displayName: 'B站',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'error', field: 'title', message: `标题超过${LIMITS.maxTitle}字限制` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'warning', field: 'tags', message: `标签最多${LIMITS.maxTags}个` });
    }
    return { valid: content.title.length <= LIMITS.maxTitle, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = makeVideoTitle(content.title);
    const desc = buildDescription(content.blocks);
    const timeline = buildTimeline(content.blocks);
    const body = `${desc}\n\n${timeline}`;
    const tags = content.tags.slice(0, LIMITS.maxTags);

    return { title, summary: desc.substring(0, 150) + '…', body, tags,
      coverImage: content.coverImage,
      extra: { category: '知识', contentType: 'video', timeline, isOriginal: true } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxDesc, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
