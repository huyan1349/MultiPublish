import { create } from 'zustand';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

interface ContentItem {
  id: string;
  title: string;
  rawMarkdown: string;
  tags: string[];
  summary?: string;
  coverImage?: string;
  outputs?: PlatformOutputItem[];
  createdAt: string;
}

interface PlatformOutputItem {
  id: string;
  platform: string;
  platformName: string;
  title: string;
  summary?: string;
  body: string;
  tags: string[];
  status: string;
  validationMessages: Array<{ level: string; field: string; message: string }>;
}

interface PublishRecord {
  id: string;
  contentId: string;
  platform: string;
  platformName: string;
  status: string;
  message: string;
  mockUrl?: string;
  publishedAt: string;
}

interface ContentDraft {
  title: string;
  rawMarkdown: string;
  tags: string;
  coverImage: string;
  summary: string;
}

interface ContentState {
  draft: ContentDraft;
  contents: ContentItem[];
  records: PublishRecord[];
  setDraft: (partial: Partial<ContentDraft>) => void;
  resetDraft: () => void;
  loadDemo: () => void;
  saveContent: (content: ContentItem) => Promise<void>;
  addOutput: (contentId: string, output: PlatformOutputItem) => Promise<void>;
  loadContents: () => Promise<void>;
  addRecord: (record: PublishRecord) => Promise<void>;
  loadRecords: () => Promise<void>;
}

const DEMO_HTML = `<h2>多平台内容发布工具</h2>
<p>很多创作者需要在公众号、知乎、B站、小红书等平台同步发布内容，但每个平台的格式、语气和发布字段都不一样。</p>
<p>公众号更适合正式长文，知乎更强调逻辑分析，B站需要视频简介和标签，小红书则更偏向短标题、清单式表达和话题标签。</p>
<h3>核心功能</h3>
<ul>
  <li><p>统一编辑：在一个界面输入标题、正文和标签</p></li>
  <li><p>智能适配：自动转换为各平台最佳排版</p></li>
  <li><p>一键发布：真实发布到多个平台</p></li>
  <li><p>发布记录：追踪所有历史发布</p></li>
</ul>
<h3>架构设计</h3>
<p>系统采用标准内容模型和平台适配器模式。新增平台时，只需要增加新的 Adapter，不需要重写整个系统。</p>
<blockquote><p>一次创作，多端适配。让内容在不同平台中保持一致表达，同时适配各自的平台生态。</p></blockquote>`;

export const useContentStore = create<ContentState>((set, get) => ({
  draft: { title: '', rawMarkdown: '', tags: '', coverImage: '', summary: '' },
  contents: [],
  records: [],

  setDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  resetDraft: () => set({ draft: { title: '', rawMarkdown: '', tags: '', coverImage: '', summary: '' } }),
  loadDemo: () => set({ draft: { title: '我做了一个多平台内容发布工具', rawMarkdown: DEMO_HTML, tags: '内容创作,效率工具,自媒体,多平台', coverImage: '', summary: '一个帮助创作者提升多平台发布效率的工具' } }),

  saveContent: async (content) => {
    const contents = [...get().contents, content];
    await storage.set('contents', contents);
    set({ contents });
  },

  addOutput: async (contentId, output) => {
    const contents = get().contents.map((c) =>
      c.id === contentId ? { ...c, outputs: [...(c.outputs || []), output] } : c
    );
    await storage.set('contents', contents);
    set({ contents });
  },

  loadContents: async () => {
    const contents = (await storage.get<ContentItem[]>('contents')) || [];
    set({ contents });
  },

  addRecord: async (record) => {
    const records = [...get().records, record];
    await storage.set('records', records);
    set({ records });
  },

  loadRecords: async () => {
    const records = (await storage.get<PublishRecord[]>('records')) || [];
    set({ records });
  },
}));
