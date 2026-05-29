import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../types';
import { blocksToPlainText } from '../parserService';

const LIMITS = { maxTitle: 60, maxTags: 5 };

function buildBody(blocks: StandardContent['blocks']): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': return `## ${b.text}\n\n`;
      case 'paragraph': return `${b.text}\n\n`;
      case 'list': {
        const items = (b.items || []).map((item) => `- ${item}`).join('\n');
        return `${items}\n\n`;
      }
      case 'quote': return `> ${(b.text || '').replace(/\n/g, '\n> ')}\n\n`;
      case 'image': return `![${b.caption || ''}](${b.url})\n\n`;
      default: return '';
    }
  }).join('');
}

export const zhihuAdapter: PlatformAdapter = {
  platform: 'zhihu',
  displayName: '知乎',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'warning', field: 'title', message: `标题过长，建议≤${LIMITS.maxTitle}字` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'info', field: 'tags', message: `知乎建议${LIMITS.maxTags}个以内话题标签` });
    }
    return { valid: true, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = content.title;
    const plainText = blocksToPlainText(content.blocks);
    const body = buildBody(content.blocks);
    const tags = content.tags.slice(0, LIMITS.maxTags).map((t) => t.replace(/^#/, ''));
    return {
      title, summary: plainText.substring(0, 100) + '…', body, tags,
      extra: { contentType: 'article', structure: 'conclusion-first' },
    };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: Infinity, maxTags: LIMITS.maxTags, needsCover: false,
    };
  },
};
