import { create } from 'zustand';
import { getAdapter, listAdapters } from '../adapters/AdapterFactory';
import { parseHtmlToBlocks } from '../adapters/parserService';
import type { PlatformType, PlatformOutputDraft, ValidationResult, PreviewMeta, StandardContent } from '../adapters/types';

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

interface ContentDraft {
  title: string;
  htmlContent: string;
  tags: string;
  coverImage: string;
}

const DRAFT_STORAGE_KEY = 'multipublish_draft';

export interface BeautifiedContent {
  title: string;
  htmlBody: string;
  tags: string[];
}

interface ContentState {
  draft: ContentDraft;
  setDraft: (partial: Partial<ContentDraft>) => void;
  resetDraft: () => void;
  loadDemo: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => { draft: ContentDraft; savedAt: number } | null;
  selectedPlatforms: Set<PlatformType>;
  platformStates: Map<PlatformType, PlatformPublishState>;
  beautifiedOutputs: Map<PlatformType, BeautifiedContent>;
  togglePlatform: (p: PlatformType) => void;
  refreshPlatformOutputs: () => void;
  setPlatformPublishStatus: (p: PlatformType, status: PublishStatus, message?: string) => void;
  resetPublishStates: () => void;
  setBeautifiedOutput: (p: PlatformType, content: BeautifiedContent) => void;
  applyBeautifiedContent: (p: PlatformType, title: string, body: string, tags: string[]) => void;
  clearBeautifiedOutput: (p: PlatformType) => void;
}

function buildContent(draft: ContentDraft): StandardContent {
  const blocks = parseHtmlToBlocks(draft.htmlContent);
  return {
    id: `draft-${Date.now()}`,
    title: draft.title || '未命名',
    rawMarkdown: draft.htmlContent,
    blocks,
    tags: draft.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    coverImage: draft.coverImage || undefined,
  };
}

function buildPlatformState(platform: PlatformType, content: StandardContent): PlatformPublishState {
  const adapter = getAdapter(platform);
  return {
    platform,
    platformName: adapter.displayName,
    status: 'idle',
    message: '',
    output: adapter.transform(content),
    validation: adapter.validate(content),
    meta: adapter.getPreviewMeta(adapter.transform(content)),
  };
}

const allPlatforms: PlatformType[] = ['wechat', 'zhihu', 'bilibili', 'xiaohongshu'];

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

function buildInitialStates(): Map<PlatformType, PlatformPublishState> {
  const content = buildContent({ title: '', htmlContent: '', tags: '', coverImage: '' });
  const map = new Map<PlatformType, PlatformPublishState>();
  for (const p of allPlatforms) map.set(p, buildPlatformState(p, content));
  return map;
}

export const useContentStore = create<ContentState>((set, get) => ({
  draft: { title: '', htmlContent: '', tags: '', coverImage: '' },
  setDraft: (partial) => {
    set((s) => ({ draft: { ...s.draft, ...partial } }));
    get().refreshPlatformOutputs();
  },
  resetDraft: () => {
    set({ draft: { title: '', htmlContent: '', tags: '', coverImage: '' } });
    get().refreshPlatformOutputs();
  },
  loadDemo: () => {
    set({
      draft: {
        title: '我做了一个多平台内容发布工具',
        htmlContent: DEMO_HTML,
        tags: '内容创作, 效率工具, 自媒体, 多平台',
        coverImage: '',
      },
    });
    get().refreshPlatformOutputs();
  },
  saveToStorage: () => {
    try {
      const data = { draft: get().draft, savedAt: Date.now() };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  },
  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { draft: ContentDraft; savedAt: number };
    } catch {
      return null;
    }
  },

  // Platform
  selectedPlatforms: new Set(allPlatforms),
  platformStates: buildInitialStates(),
  beautifiedOutputs: new Map<PlatformType, BeautifiedContent>(),
  togglePlatform: (p) => set((s) => {
    const next = new Set(s.selectedPlatforms);
    next.has(p) ? next.delete(p) : next.add(p);
    return { selectedPlatforms: next };
  }),
  refreshPlatformOutputs: () => {
    const content = buildContent(get().draft);
    const map = new Map<PlatformType, PlatformPublishState>();
    for (const p of allPlatforms) map.set(p, buildPlatformState(p, content));
    set({ platformStates: map });
  },
  setPlatformPublishStatus: (p, status, message = '') => set((s) => {
    const next = new Map(s.platformStates);
    const cur = next.get(p);
    if (cur) next.set(p, { ...cur, status, message });
    return { platformStates: next };
  }),
  resetPublishStates: () => set((s) => {
    const next = new Map(s.platformStates);
    for (const [p, st] of next) {
      if (st.status !== 'publishing') next.set(p, { ...st, status: 'idle', message: '' });
    }
    return { platformStates: next };
  }),
  setBeautifiedOutput: (p, content) => set((s) => {
    const next = new Map(s.beautifiedOutputs);
    next.set(p, content);
    return { beautifiedOutputs: next };
  }),
  applyBeautifiedContent: (p, title, body, tags) => set((s) => {
    const next = new Map(s.platformStates);
    const cur = next.get(p);
    if (!cur) return {};
    const adapter = getAdapter(p);
    const newOutput: PlatformOutputDraft = { ...cur.output, title, body, tags };
    next.set(p, {
      ...cur,
      output: newOutput,
      meta: adapter.getPreviewMeta(newOutput),
    });
    const beautifiedNext = new Map(s.beautifiedOutputs);
    beautifiedNext.delete(p);
    return { platformStates: next, beautifiedOutputs: beautifiedNext };
  }),
  clearBeautifiedOutput: (p) => set((s) => {
    const next = new Map(s.beautifiedOutputs);
    next.delete(p);
    return { beautifiedOutputs: next };
  }),
}));
