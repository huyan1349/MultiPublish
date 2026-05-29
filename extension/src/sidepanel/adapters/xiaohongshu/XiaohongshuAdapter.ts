import type { PlatformAdapter, StandardContent, PlatformOutputDraft, ValidationResult, PreviewMeta } from '../PlatformAdapter.js';
import { blocksToPlainText } from '../parserService.js';

const LIMITS = { maxTitle: 20, maxBody: 1000, maxTags: 10 };

const EMOJIS = ['✨', '🔥', '💡', '📌', '🚀', '💪', '🎯', '⭐', '🌟', '✅'];

function makeShortTitle(title: string): string {
  if (title.length <= LIMITS.maxTitle) return title;
  return title.substring(0, LIMITS.maxTitle - 1) + '…';
}

function addEmojiToTitle(title: string): string {
  if (/[\u{1F000}-\u{1FFFF}]/u.test(title)) return title;
  return `${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} ${title}`;
}

function buildNoteBody(blocks: StandardContent['blocks']): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        lines.push(`📌 ${b.text}`);
        lines.push('');
        break;
      case 'paragraph': {
        const sentences = (b.text || '').split(/[。！？]/);
        for (const s of sentences) {
          if (s.trim()) lines.push(`${s.trim()}。`);
        }
        lines.push('');
        break;
      }
      case 'list': {
        for (const item of (b.items || [])) {
          lines.push(`${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]} ${item}`);
        }
        lines.push('');
        break;
      }
      case 'quote':
        lines.push(`💬 ${(b.text || '').replace(/\n/g, ' ')}`);
        lines.push('');
        break;
      case 'image':
        lines.push(`[图片: ${b.caption || b.url || ''}]`);
        lines.push('');
        break;
    }
  }

  let body = lines.join('\n').substring(0, LIMITS.maxBody);
  if (!body.includes('#')) {
    const hashTags = ['#内容创作', '#效率工具', '#自媒体', '#干货分享', '#创作灵感'];
    body += '\n\n' + hashTags.slice(0, 4).join(' ');
  }
  return body;
}

export const xiaohongshuAdapter: PlatformAdapter = {
  platform: 'xiaohongshu',
  displayName: '小红书',

  validate(content: StandardContent): ValidationResult {
    const messages: ValidationResult['messages'] = [];
    if (content.title.length > LIMITS.maxTitle) {
      messages.push({ level: 'error', field: 'title', message: `小红书标题不能超过${LIMITS.maxTitle}字` });
    }
    const plainText = blocksToPlainText(content.blocks);
    if (plainText.length > LIMITS.maxBody) {
      messages.push({ level: 'warning', field: 'body', message: `正文超过${LIMITS.maxBody}字，将被截断` });
    }
    if (content.tags.length > LIMITS.maxTags) {
      messages.push({ level: 'info', field: 'tags', message: `标签最多${LIMITS.maxTags}个` });
    }
    if (!content.coverImage) {
      messages.push({ level: 'info', field: 'coverImage', message: '建议上传3:4竖版封面图' });
    }
    return { valid: true, messages };
  },

  transform(content: StandardContent): PlatformOutputDraft {
    const title = addEmojiToTitle(makeShortTitle(content.title));
    const body = buildNoteBody(content.blocks);
    const tags = content.tags.slice(0, LIMITS.maxTags)
      .map((t) => t.startsWith('#') ? t : `#${t}`);

    return { title, body, tags,
      coverImage: content.coverImage,
      extra: { contentType: 'note', style: 'casual', ratio: '3:4' } };
  },

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta {
    return {
      titleCharCount: output.title.length, bodyCharCount: output.body.length,
      tagCount: output.tags.length, maxTitleLength: LIMITS.maxTitle,
      maxBodyLength: LIMITS.maxBody, maxTags: LIMITS.maxTags, needsCover: true,
    };
  },
};
