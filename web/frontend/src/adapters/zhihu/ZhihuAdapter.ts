import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../types';
import { blocksToPlainText } from '../parserService';

const LIMITS = { maxTitle: 60, maxTags: 5 };

function countBodyChars(body: string): number {
  return body.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '').length;
}

function buildBody(blocks: StandardContent['blocks']): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': {
        const tag = b.level === 1 ? 'h2' : `h${(b.level || 2) + 1}`;
        return `<${tag} style="font-size:${b.level === 1 ? '22px' : '18px'};font-weight:bold;color:#1a1a1a;margin:20px 0 12px;">${b.text}</${tag}>`;
      }
      case 'paragraph':
        return `<p style="font-size:15px;line-height:1.75;color:#1a1a1a;margin:8px 0;">${b.text}</p>`;
      case 'list': {
        const items = (b.items || []).map((item) => `<li style="margin:4px 0;padding-left:4px;">${item}</li>`).join('');
        return `<ul style="padding-left:24px;margin:8px 0;">${items}</ul>`;
      }
      case 'quote':
        return `<blockquote style="border-left:3px solid #0066FF;padding:8px 16px;color:#666;margin:12px 0;background:#f0f5ff;"><p style="font-size:14px;line-height:1.6;margin:4px 0;">${(b.text || '').replace(/\n/g, '<br/>')}</p></blockquote>`;
      case 'image':
        return b.url
          ? `<p style="text-align:center;margin:12px 0;"><img src="${b.url}" alt="${b.caption || ''}" style="max-width:100%;border-radius:4px;"/></p>`
          : '';
      default: return '';
    }
  }).join('\n');
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
      titleCharCount: output.title.length, bodyCharCount: countBodyChars(output.body),
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: Infinity, maxTags: LIMITS.maxTags, needsCover: false,
    };
  },
};
