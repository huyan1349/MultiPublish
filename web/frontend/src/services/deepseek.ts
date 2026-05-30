const API_KEY = 'sk-ef508b028884458a8972f038a4e8abfc';
const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const TIMEOUT_MS = 30000;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `DeepSeek API ${res.status}`);
    }

    const data = await res.json();
    return (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI 请求超时（30s），请稍后重试');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonResponse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export type PlatformStyle = 'wechat' | 'zhihu' | 'bilibili' | 'xiaohongshu';

export interface BeautifyContentInput {
  platform: PlatformStyle;
  platformName: string;
  title: string;
  htmlContent: string;
  tags: string[];
}

export interface BeautifyContentResult {
  title: string;
  htmlBody: string;
  tags: string[];
}

const PLATFORM_SYSTEM_PROMPTS: Record<PlatformStyle, string> = {
  wechat: `你是一位资深公众号编辑。请将用户的内容改写为微信公众号风格，要求：
1. 标题：正式、有深度、可适当使用问号或感叹号增强吸引力，15字以内
2. 正文风格：正式严谨、段落清晰、逻辑递进，每段3-5句话
3. 关键短语用<strong>加粗</strong>突出
4. 适当使用小标题<h3>分段，增强可读性
5. 结尾添加引导关注的句子，如"关注我，获取更多深度内容"
6. 保持HTML标签格式输出，不要丢失原有的标签结构
7. 标签：3-5个与内容相关的热门标签`,

  zhihu: `你是一位知乎高赞答主。请将用户的内容改写为知乎专栏风格，要求：
1. 标题：理性、专业、可带有数据或观点倾向，20字以内
2. 正文风格：逻辑严密、数据支撑、专业术语、理性分析
3. 适当引用权威来源或数据，使用"据XX统计"、"研究表明"等表达
4. 使用<h3>小标题组织论点，每个论点配以论据
5. 适当使用<blockquote>引用重要观点
6. 保持HTML标签格式输出
7. 标签：3-5个专业领域标签`,

  bilibili: `你是一位B站UP主。请将用户的内容改写为B站动态/专栏风格，要求：
1. 标题：轻松活泼、带梗、可使用"！"增强语气，20字以内
2. 正文风格：轻松活泼、二次元用语、弹幕感、短句为主
3. 适当使用emoji点缀（🔥✨🎮💡👍等），但不要过度
4. 用短段落、换行增强节奏感
5. 可以使用"家人们"、"这波"、"绝了"等B站常用表达
6. 保持HTML标签格式输出
7. 标签：3-5个B站热门标签`,

  xiaohongshu: `你是一位小红书博主。请将用户的内容改写为小红书笔记风格，要求：
1. 标题：种草感、吸睛、短小精悍，15字以内，可使用emoji开头
2. 正文风格：种草感、清单体、emoji丰富、短句为主
3. 大量使用emoji（✨🔥💕🌟📌💡等），每段1-2个
4. 使用数字列表"1️⃣2️⃣3️⃣"或"①②③"组织内容
5. 结尾添加话题引导，如"姐妹们觉得怎么样？评论区告诉我～"
6. 保持HTML标签格式输出
7. 标签：5-8个小红书热门话题标签（不带#号）`,
};

export async function beautifyContentForPlatform(input: BeautifyContentInput): Promise<BeautifyContentResult> {
  const systemPrompt = PLATFORM_SYSTEM_PROMPTS[input.platform] || PLATFORM_SYSTEM_PROMPTS.wechat;

  const plainText = input.htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const raw = await chat([
    {
      role: 'system',
      content: `${systemPrompt}\n\n请严格按以下JSON格式返回，不要包含任何其他文字：\n{"title":"改写后的标题","htmlBody":"改写后的HTML正文","tags":["标签1","标签2"]}`,
    },
    {
      role: 'user',
      content: `原标题：${input.title}\n\n原正文（HTML）：${input.htmlContent}\n\n原正文（纯文本参考）：${plainText.slice(0, 2000)}\n\n原标签：${input.tags.join('、')}\n\n请改写为${input.platformName}风格，返回JSON。`,
    },
  ], 0.7);

  return parseJsonResponse<BeautifyContentResult>(raw, {
    title: input.title,
    htmlBody: input.htmlContent,
    tags: input.tags,
  });
}

export interface BeautifyOptions {
  platform: string;
  platformName: string;
  title: string;
  body: string;
  tags: string[];
}

export async function beautifyForPlatform(opts: BeautifyOptions): Promise<{
  title: string;
  body: string;
  tags: string[];
}> {
  const platformStyles: Record<string, string> = {
    wechat: '公众号风格：正式、深度、段落清晰、适当加粗关键词、结尾引导关注',
    zhihu: '知乎风格：逻辑严密、数据支撑、专业术语、理性分析、适当引用',
    bilibili: 'B站风格：轻松活泼、二次元用语、弹幕感、短句为主、emoji点缀',
    xiaohongshu: '小红书风格：种草感、清单体、emoji丰富、短标题吸睛、话题感强',
  };

  const style = platformStyles[opts.platform] || '通用风格：清晰简洁';

  const raw = await chat([
    {
      role: 'system',
      content: `你是一个专业的内容编辑，擅长将同一篇内容适配为不同平台的风格。请按照${style}来改写内容。只返回JSON，不要任何其他文字。返回格式：{"title":"改写后的标题","body":"改写后的正文","tags":["标签1","标签2"]}`,
    },
    {
      role: 'user',
      content: `原标题：${opts.title}\n\n原正文：${opts.body}\n\n原标签：${opts.tags.join('、')}\n\n请改写为${opts.platformName}风格。`,
    },
  ], 0.7);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { title: opts.title, body: raw, tags: opts.tags };
  }
}

export interface InspirationAngle {
  title: string;
  angle: string;
  hook: string;
  targetAudience: string;
  keyMessage: string;
  outline: string;
  tags: string[];
  estimatedReadTime: string;
  platformSuggestion: string;
}

export interface InspirationResult {
  topic: string;
  angles: InspirationAngle[];
}

const INSPIRATION_SYSTEM_PROMPT = `你是一位资深内容策划师，为中文自媒体创作者提供专业的内容灵感。

你的任务是根据用户输入的话题（可为空），生成 3 个不同角度的内容灵感。每个角度必须有明确的差异化定位。

## 输出格式
严格返回以下 JSON，不要包含任何其他文字：
{
  "topic": "话题总结（5-10字）",
  "angles": [
    {
      "title": "建议标题（15-25字，有吸引力）",
      "angle": "角度类型（深度分析/教程攻略/观点评论/故事叙事/清单推荐/趋势解读）",
      "hook": "开篇钩子，一句话抓住读者注意力（20-40字）",
      "targetAudience": "目标读者画像（如：职场新人/科技爱好者/宝妈群体）",
      "keyMessage": "核心观点，一句话概括（15-30字）",
      "outline": "内容大纲，每行一个要点，3-6个要点。每个要点后跟一句简短说明。用换行符分隔。",
      "tags": ["标签1", "标签2", "标签3", "标签4"],
      "estimatedReadTime": "预计阅读时长（如：3分钟/8分钟）",
      "platformSuggestion": "最适合发布的平台（公众号/知乎/B站/小红书）"
    }
  ]
}

## 质量要求
- 3 个角度必须有差异化：不要三个都是同类型，至少覆盖 2 种不同的角度类型
- 标题要具体、有信息量，避免空泛的「关于XXX的思考」
- hook 要能引发好奇心或共鸣
- outline 每个要点要有实质内容，不是空洞的小标题
- 标签要精准、有搜索价值
- 如果用户指定了平台偏好，优先给出适合该平台的角度

## 示例

用户输入：「AI 工具提升工作效率」

返回参考：
{
  "topic": "AI工具提效实战",
  "angles": [
    {
      "title": "我用这5个AI工具，每天省出3小时——真实体验报告",
      "angle": "清单推荐",
      "hook": "不是ChatGPT，也不是Midjourney——这5个你可能没听过的AI工具，才是真正的效率杀手。",
      "targetAudience": "职场白领、自由职业者",
      "keyMessage": "选对AI工具比多用AI更重要，关键是融入工作流",
      "outline": "1. 我的工作流痛点：每天被重复性任务吃掉的时间\\n2. 工具一：Notion AI —— 会议纪要自动生成，10分钟变30秒\\n3. 工具二：Gamma —— PPT不再手动画，输入大纲秒出演示文稿\\n4. 工具三：Otter.ai —— 采访录音实时转文字，记者必备\\n5. 工具四：Zapier + ChatGPT —— 自动化邮件分类与回复模板\\n6. 避坑指南：三个常见的AI工具选择误区",
      "tags": ["AI工具", "效率提升", "职场技能", "数字工具推荐"],
      "estimatedReadTime": "6分钟",
      "platformSuggestion": "公众号"
    },
    {
      "title": "别再神话AI了——一个工具党的冷静反思",
      "angle": "观点评论",
      "hook": "所有人都在说AI改变世界，但用了半年之后，我发现真相没那么简单。",
      "targetAudience": "对AI保持观望的普通职场人",
      "keyMessage": "AI是杠杆不是魔法，效果取决于使用者的判断力",
      "outline": "1. 热潮之下：朋友圈人均AI专家，实际落地几何？\\n2. 三个翻车案例：AI生成内容带来的尴尬时刻\\n3. 人机协作的正确姿势：什么时候该信AI，什么时候该信自己\\n4. 我的原则：用AI省时间，用人脑做决策\\n5. 未来展望：工具进化很快，但核心能力不变",
      "tags": ["AI思考", "效率工具", "深度观点", "职场反思"],
      "estimatedReadTime": "5分钟",
      "platformSuggestion": "知乎"
    },
    {
      "title": "30天AI挑战：零基础小白如何用AI搭建个人知识库",
      "angle": "教程攻略",
      "hook": "不会写代码、不懂机器学习，我用30天时间，从零搭建了一个能自动整理笔记的AI知识库。",
      "targetAudience": "想用AI但不知从何下手的新手",
      "keyMessage": "AI入门不需要技术背景，从一个小需求开始就行",
      "outline": "1. 起点：笔记太多找不到，我需要一个会思考的助手\\n2. 第1-7天：选工具——对比了5款AI笔记应用后的选择\\n3. 第8-14天：建结构——怎么让AI理解你的知识体系\\n4. 第15-21天：自动化——设置规则让AI自动分类和关联\\n5. 第22-30天：优化——用了一个月的真实体验和调整\\n6. 复盘：做对了什么、走了哪些弯路",
      "tags": ["AI入门", "知识管理", "个人成长", "效率教程"],
      "estimatedReadTime": "7分钟",
      "platformSuggestion": "B站"
    }
  ]
}`;

export async function generateInspiration(topic?: string, platform?: PlatformStyle): Promise<InspirationResult> {
  const platformContext = platform
    ? `\n用户偏好平台：${platform === 'wechat' ? '公众号' : platform === 'zhihu' ? '知乎' : platform === 'bilibili' ? 'B站' : '小红书'}。请优先给出适合该平台风格的角度。`
    : '';

  const raw = await chat([
    { role: 'system', content: INSPIRATION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请给我${topic ? `关于「${topic}」` : '最近热门'}的内容灵感。${platformContext}\n要求：3个角度至少覆盖2种不同类型，标题要有信息量，大纲要有实质内容。`,
    },
  ], 0.8);

  return parseJsonResponse<InspirationResult>(raw, {
    topic: topic || '热门话题',
    angles: [],
  });
}

export async function generateTitle(body: string): Promise<string[]> {
  const raw = await chat([
    {
      role: 'system',
      content: `你是一位专业标题策划师。根据正文内容生成 5 个不同风格的标题，覆盖以下类型：悬念型、数据型、利益型、对比型、故事型。

要求：
- 每个标题 15-25 字
- 具体有信息量，避免空泛
- 不同标题面向不同平台调性（公众号正式、知乎专业、B站活泼、小红书种草）
- 只返回 JSON 数组，不要任何其他文字
- 格式：["标题1","标题2","标题3","标题4","标题5"]`,
    },
    {
      role: 'user',
      content: `正文内容：\n${body.slice(0, 1500)}`,
    },
  ], 0.8);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [body.slice(0, 30) + '…'];
  }
}

export async function suggestTags(title: string, body: string): Promise<string[]> {
  const raw = await chat([
    {
      role: 'system',
      content: `你是标签策略师。根据标题和正文推荐 5-8 个精准标签。

要求：
- 兼顾热度标签和长尾标签（3-4个大众标签 + 2-4个细分标签）
- 标签要有搜索价值，是读者会主动搜索的关键词
- 不要过于宽泛（如"生活"）或过于冷门
- 考虑多平台适用性
- 只返回 JSON 数组，不要任何其他文字
- 格式：["标签1","标签2","标签3","标签4","标签5"]`,
    },
    {
      role: 'user',
      content: `标题：${title}\n正文：${body.slice(0, 800)}`,
    },
  ], 0.5);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
