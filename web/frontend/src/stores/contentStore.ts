import { create } from 'zustand';
import type { PlatformType, PlatformOutputDraft, ValidationResult, PreviewMeta, StandardContent } from '../adapters/types';
import { getAdapter } from '../adapters/AdapterFactory';
import { parseHtmlToBlocks } from '../adapters/parserService';

export type PublishStatus = 'idle' | 'publishing' | 'success' | 'failed';

export interface PlatformPublishState {
  platform: PlatformType;
  platformName: string;
  status: PublishStatus;
  message: string;
  output: PlatformOutputDraft;
  validation: ValidationResult;
  meta: PreviewMeta;
}

interface ContentState {
  title: string;
  htmlContent: string;
  tags: string;
  coverImage: string;
  selectedPlatforms: Set<PlatformType>;
  platformStates: Map<PlatformType, PlatformPublishState>;
  isPublishing: boolean;

  setTitle: (title: string) => void;
  setHtmlContent: (html: string) => void;
  setTags: (tags: string) => void;
  setCoverImage: (url: string) => void;
  togglePlatform: (platform: PlatformType) => void;
  loadDemo: () => void;
  refreshPlatformOutputs: () => void;
  setPlatformPublishStatus: (platform: PlatformType, status: PublishStatus, message?: string) => void;
  resetPublishStates: () => void;
}

function buildStandardContent(title: string, html: string, tagsStr: string, coverImage: string): StandardContent {
  const blocks = parseHtmlToBlocks(html);
  const plainText = blocks.map((b) => {
    if (b.type === 'heading' || b.type === 'paragraph' || b.type === 'quote') return b.text || '';
    if (b.type === 'list') return (b.items || []).join(' ');
    return '';
  }).filter(Boolean).join(' ');

  return {
    id: `draft-${Date.now()}`,
    title: title || '未命名',
    summary: plainText.substring(0, 120),
    rawMarkdown: html,
    blocks,
    tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    coverImage: coverImage || undefined,
  };
}

function buildPlatformState(platform: PlatformType, content: StandardContent): PlatformPublishState {
  const adapter = getAdapter(platform);
  const validation = adapter.validate(content);
  const output = adapter.transform(content);
  const meta = adapter.getPreviewMeta(output);
  return {
    platform,
    platformName: adapter.displayName,
    status: 'idle',
    message: '',
    output,
    validation,
    meta,
  };
}

const DEMO_HTML = `<h2>多平台内容发布工具</h2>
<p>很多创作者需要在公众号、知乎、B站、小红书等平台同步发布内容，但每个平台的格式、语气和发布字段都不一样。</p>
<p>公众号更适合正式长文，知乎更强调逻辑分析，B站需要视频简介和标签，小红书则更偏向短标题、清单式表达和话题标签。</p>
<h3>核心功能</h3>
<ul>
  <li><p>统一编辑：在一个界面输入标题、正文和标签</p></li>
  <li><p>智能适配：自动转换为各平台最佳排版</p></li>
  <li><p>一键发布：通过 Chrome 扩展真实发布到多个平台</p></li>
  <li><p>发布记录：追踪所有历史发布</p></li>
</ul>
<h3>架构设计</h3>
<p>系统采用标准内容模型和平台适配器模式。新增平台时，只需要增加新的 Adapter，不需要重写整个系统。</p>
<blockquote><p>一次创作，多端适配。让内容在不同平台中保持一致表达，同时适配各自的平台生态。</p></blockquote>`;

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

function buildAllPlatformStates(title: string, html: string, tags: string, coverImage: string) {
  const content = buildStandardContent(title, html, tags, coverImage);
  const map = new Map<PlatformType, PlatformPublishState>();
  for (const p of allPlatforms) {
    map.set(p, buildPlatformState(p, content));
  }
  return map;
}

export const useContentStore = create<ContentState>((set, get) => ({
  title: '',
  htmlContent: '',
  tags: '',
  coverImage: '',
  selectedPlatforms: new Set(allPlatforms),
  platformStates: buildAllPlatformStates('', '', '', ''),
  isPublishing: false,

  setTitle: (title) => {
    set({ title });
    get().refreshPlatformOutputs();
  },
  setHtmlContent: (html) => {
    set({ htmlContent: html });
    get().refreshPlatformOutputs();
  },
  setTags: (tags) => {
    set({ tags });
    get().refreshPlatformOutputs();
  },
  setCoverImage: (url) => {
    set({ coverImage: url });
    get().refreshPlatformOutputs();
  },

  togglePlatform: (platform) => {
    set((s) => {
      const next = new Set(s.selectedPlatforms);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return { selectedPlatforms: next };
    });
  },

  refreshPlatformOutputs: () => {
    const { title, htmlContent, tags, coverImage } = get();
    const content = buildStandardContent(title, htmlContent, tags, coverImage);
    const map = new Map<PlatformType, PlatformPublishState>();
    for (const p of allPlatforms) {
      map.set(p, buildPlatformState(p, content));
    }
    set({ platformStates: map });
  },

  setPlatformPublishStatus: (platform, status, message = '') => {
    set((s) => {
      const next = new Map(s.platformStates);
      const current = next.get(platform);
      if (current) {
        next.set(platform, { ...current, status, message });
      }
      return { platformStates: next };
    });
  },

  resetPublishStates: () => {
    set((s) => {
      const next = new Map(s.platformStates);
      for (const [p, state] of next) {
        if (state.status !== 'publishing') {
          next.set(p, { ...state, status: 'idle', message: '' });
        }
      }
      return { platformStates: next };
    });
  },

  loadDemo: () => {
    set({
      title: '我做了一个多平台内容发布工具',
      htmlContent: DEMO_HTML,
      tags: '内容创作, 效率工具, 自媒体, 多平台',
      coverImage: '',
    });
    get().refreshPlatformOutputs();
  },
}));
