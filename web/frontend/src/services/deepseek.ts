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

export interface StreamCallback {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallback,
  temperature = 0.8,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

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
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `DeepSeek API ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('不支持流式读取');

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onToken(delta);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onError(new Error('AI 请求超时，请稍后重试'));
    } else {
      callbacks.onError(err instanceof Error ? err : new Error('流式请求失败'));
    }
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonResponse<T>(raw: string, fallback: T, requiredKeys?: string[]): T {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    const parsed = JSON.parse(cleaned) as T;
    if (requiredKeys) {
      for (const key of requiredKeys) {
        const val = (parsed as Record<string, unknown>)[key];
        if (val === undefined || val === null || val === '') return fallback;
      }
    }
    return parsed;
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
7. 标签：3-5个与内容相关的热门标签
8. 重要：如果输入内容是大纲/要点/列表形式（简短条目、项目符号、编号列表），必须将每个要点展开为完整的段落，补充细节、案例或论述，使其成为一篇内容充实、可独立发布的完整文章`,

  zhihu: `你是一位知乎高赞答主。请将用户的内容改写为知乎专栏风格，要求：
1. 标题：理性、专业、可带有数据或观点倾向，20字以内
2. 正文风格：逻辑严密、数据支撑、专业术语、理性分析
3. 适当引用权威来源或数据，使用"据XX统计"、"研究表明"等表达
4. 使用<h3>小标题组织论点，每个论点配以论据
5. 适当使用<blockquote>引用重要观点
6. 保持HTML标签格式输出
7. 标签：3-5个专业领域标签
8. 重要：如果输入内容是大纲/要点/列表形式（简短条目、项目符号、编号列表），必须将每个要点展开为完整的段落，补充论据、数据或案例分析，使其成为一篇内容充实、可独立发布的完整文章`,

  bilibili: `你是一位B站UP主。请将用户的内容改写为B站动态/专栏风格，要求：
1. 标题：轻松活泼、带梗、可使用"！"增强语气，20字以内
2. 正文风格：轻松活泼、二次元用语、弹幕感、短句为主
3. 适当使用emoji点缀（🔥✨🎮💡👍等），但不要过度
4. 用短段落、换行增强节奏感
5. 可以使用"家人们"、"这波"、"绝了"等B站常用表达
6. 保持HTML标签格式输出
7. 标签：3-5个B站热门标签
8. 重要：如果输入内容是大纲/要点/列表形式（简短条目、项目符号、编号列表），必须将每个要点展开为完整的段落，补充细节、趣事或个人体验，使其成为一篇内容充实、可独立发布的完整文章`,

  xiaohongshu: `你是一位小红书博主。请将用户的内容改写为小红书笔记风格，要求：
1. 标题：种草感、吸睛、短小精悍，15字以内，可使用emoji开头
2. 正文风格：种草感、清单体、emoji丰富、短句为主
3. 大量使用emoji（✨🔥💕🌟📌💡等），每段1-2个
4. 使用数字列表"1️⃣2️⃣3️⃣"或"①②③"组织内容
5. 结尾添加话题引导，如"姐妹们觉得怎么样？评论区告诉我～"
6. 保持HTML标签格式输出
7. 标签：5-8个小红书热门话题标签（不带#号）
8. 重要：如果输入内容是大纲/要点/列表形式（简短条目、项目符号、编号列表），必须将每个要点展开为完整的段落，补充细节、体验分享或种草理由，使其成为一篇内容充实、可独立发布的完整笔记`,
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
  }, ['title', 'htmlBody']);
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
    const plain = body.replace(/<[^>]*>/g, '').trim();
    return [plain.slice(0, 30) + '…'];
  }
}

export interface OptimizeResult {
  title: string;
  htmlBody: string;
  explanation: string;
}

export async function optimizeContent(
  title: string,
  htmlContent: string,
  instruction?: string,
): Promise<OptimizeResult> {
  const instructionText = instruction
    ? `\n用户特别要求：${instruction}`
    : '';

  const raw = await chat([
    {
      role: 'system',
      content: `你是一位专业的内容编辑和写作教练。请优化用户提供的文章，要求：
1. 保持原文的核心观点和结构，优化表达和节奏
2. 改进标题，使其更有吸引力
3. 优化段落结构和逻辑递进
4. 提升语言的专业度和可读性
5. 保持HTML标签格式输出
6. 在explanation字段中简要说明做了哪些优化（50-100字）

请严格按以下JSON格式返回：
{"title":"优化后的标题","htmlBody":"优化后的HTML正文","explanation":"优化说明：改进了标题的吸引力，调整了段落结构使逻辑更清晰，优化了部分表达的节奏感。"}${instructionText}`,
    },
    {
      role: 'user',
      content: `原标题：${title}\n\n正文（HTML）：${htmlContent.slice(0, 6000)}\n\n请优化这篇文章，返回JSON。`,
    },
  ], 0.6);

  return parseJsonResponse<OptimizeResult>(raw, {
    title,
    htmlBody: htmlContent,
    explanation: '优化完成',
  }, ['title', 'htmlBody']);
}

export async function optimizeSelection(
  selectedText: string,
  context: string,
  instruction?: string,
): Promise<{ optimizedText: string; explanation: string }> {
  const instructionText = instruction
    ? `\n用户特别要求：${instruction}`
    : '';

  const raw = await chat([
    {
      role: 'system',
      content: `你是一位专业的内容编辑。用户选中了文章中的一段文字，请针对这段文字进行优化。
要求：
1. 根据上下文语境优化选中文案
2. 可以调整表达、增强感染力、优化节奏
3. 保持原文风格和调性，不要改变核心意思
4. 优化后的文字长度应与原文相近
5. 保持HTML标签（如果有的话）
6. 在explanation中简要说明优化了什么（20-50字）

返回JSON格式：{"optimizedText":"优化后的文字","explanation":"优化说明"}${instructionText}`,
    },
    {
      role: 'user',
      content: `上下文（整篇文章）：\n${context.slice(0, 3000)}\n\n选中的文字：\n${selectedText}\n\n请优化选中的这段文字。`,
    },
  ], 0.6);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { optimizedText: parsed.optimizedText || selectedText, explanation: parsed.explanation || '优化完成' };
  } catch {
    return { optimizedText: selectedText, explanation: raw.slice(0, 100) };
  }
}

export async function chatAboutArticle(
  messages: Array<{ role: string; content: string }>,
  articleTitle: string,
  articleContent: string,
): Promise<string> {
  const systemMsg: ChatMessage = {
    role: 'system',
    content: `你是一位资深内容编辑顾问，正在和作者讨论如何优化一篇文章。

当前文章信息：
- 标题：${articleTitle}
- 正文：${articleContent.slice(0, 4000)}

你可以：
1. 分析文章的风格、结构、优缺点
2. 提出具体的优化建议
3. 帮作者设计更有吸引力的标题
4. 建议不同平台（公众号、知乎、B站、小红书）的改写策略
5. 回答作者关于写作的任何问题

回答要具体、有实操性，不要空泛的建议。每次回复聚焦1-3个要点。`,
  };

  const allMessages: ChatMessage[] = [systemMsg, ...messages as ChatMessage[]];

  return chat(allMessages, 0.7);
}

export interface GenerateContentInput {
  platform: PlatformStyle;
  platformName: string;
  formatId: string;
  formatName: string;
  outline: { topic: string; points: string; style: string };
}

export interface GenerateContentResult {
  title: string;
  htmlBody: string;
  tags: string[];
}

const FORMAT_PROMPTS: Record<string, Record<string, string>> = {
  wechat: {
    deep: `你是一位资深公众号主编。根据大纲创作一篇公众号「深度长文」，要求：
- 2500-4000字，小标题分段（<h3>），逻辑递进
- 开篇钩子引发兴趣，中间干货密集，结尾引导关注
- 关键观点用<strong>加粗</strong>，适当引用数据
- 保持HTML格式输出，段落清晰`,
    knowledge: `你是一位公众号干货分享达人。根据大纲创作一篇「干货分享」文章，要求：
- 1500-2500字，结构化呈现，每段聚焦一个技巧
- 多用"首先/其次/最后"组织逻辑
- 实操步骤用编号列表，关键词<strong>加粗</strong>
- 结尾附总结要点，引导关注
- 保持HTML格式输出`,
    story: `你是一位公众号情感故事作者。根据大纲创作一篇「情感叙事」文章，要求：
- 第一人称或第三人称叙事，1500-2500字
- 开头设置悬念/场景，中间展开故事，结尾升华主题
- 语言真挚自然，避免过度煽情
- 适当使用对话和细节描写
- 保持HTML格式输出`,
    hotspot: `你是一位公众号热点评论员。根据大纲创作一篇「热点解读」文章，要求：
- 快速切入热点事件，1500-2000字
- 观点鲜明有态度，论据支撑
- 用<h3>划分不同分析角度
- 结尾引发讨论
- 保持HTML格式输出`,
  },
  zhihu: {
    analysis: `你是一位知乎高赞答主。根据大纲创作一篇「专业分析」回答，要求：
- 逻辑严密，数据驱动，2000-3500字
- 开头开门见山抛出核心观点
- 引用权威来源（"根据XX研究""数据显示"）
- 用<h3>组织论点，每个论点配论据
- 适当用<blockquote>引用关键信息
- 保持HTML格式输出`,
    experience: `你是一位知乎经验分享者。根据大纲创作一篇「经验分享」回答，要求：
- 第一人称真实经历，1500-2500字
- 以"作为XX领域的从业者"身份切入
- 具体案例+方法论总结
- 避免空洞说教，提供可操作建议
- 保持HTML格式输出`,
    opinion: `你是一位知乎观点评论者。根据大纲创作一篇「观点评论」回答，要求：
- 立场鲜明，论证充分，1500-2500字
- 开头亮出观点，中间逐层论证
- 用对比/辩证的方式分析
- 结尾给出结论性观点
- 保持HTML格式输出`,
    explain: `你是一位知乎科普作者。根据大纲创作一篇「科普解读」回答，要求：
- 通俗化专业知识，1500-2500字
- 用类比/举例让复杂概念易懂
- 适当引用研究和数据
- 分层次从浅到深展开
- 保持HTML格式输出`,
  },
  bilibili: {
    review: `你是一位B站UP主。根据大纲创作一篇「测评体验」专栏，要求：
- 轻松活泼口语化，1500-2500字
- 开头用🔥吸引注意力
- 优缺点对比，真实体验为主
- 短段落多换行，节奏感强
- 适当emoji点缀✨，用"家人们""绝了""这波"
- 保持HTML格式输出`,
    tutorial: `你是一位B站教程UP主。根据大纲创作一篇「教程攻略」专栏，要求：
- 步骤清晰拆解，1500-2500字
- 每步标题用<h3>，内容短段落
- 适当emoji🎮💡👍标注重点
- 语言口语化，像在和朋友说话
- 结尾总结要点
- 保持HTML格式输出`,
    commentary: `你是一位B站吐槽UP主。根据大纲创作一篇「观点评论」专栏，要求：
- 犀利幽默，弹幕感，1500-2000字
- 短句为主，多换行制造节奏
- 网络用语自然融入，但不过度
- 可以用"好家伙""离谱"等B站热词
- 适当emoji点缀🔥
- 保持HTML格式输出`,
    ranking: `你是一位B站盘点UP主。根据大纲创作一篇「盘点合集」专栏，要求：
- 排名/列表形式，1500-2500字
- 每项用<h3>标题，下面展开说明
- 每项配简短点评，语言轻松
- 开头说明排名标准，结尾总结
- 适当emoji🔥✨
- 保持HTML格式输出`,
  },
  xiaohongshu: {
    review: `你是一位小红书博主。根据大纲创作一篇「种草测评」笔记，要求：
- 种草感强，emoji丰富✨🔥💕🌟
- 标题用emoji开头，15字以内
- 使用数字列表"1️⃣2️⃣3️⃣"组织使用体验
- 每段1-2句短句，配emoji
- 结尾"姐妹们觉得怎么样？评论区告诉我～"
- 标签5-8个无#号
- 保持HTML格式输出`,
    tutorial: `你是一位小红书教程博主。根据大纲创作一篇「教程攻略」笔记，要求：
- 步骤化，用①②③或1️⃣2️⃣3️⃣编号
- 每步简洁说明，配相关emoji📌💡✨
- 开头说清能获得什么效果
- 语言亲切邻家，短句为主
- 结尾引导互动
- 标签5-8个
- 保持HTML格式输出`,
    collection: `你是一位小红书好物博主。根据大纲创作一篇「好物合集」笔记，要求：
- 清单推荐形式，每项简短种草
- emoji丰富🔥✨💕🌟📌
- 每项说明：物品+亮点+推荐理由
- 开头总述合集主题
- 结尾"你最心动哪一个？"
- 标签5-8个
- 保持HTML格式输出`,
    explore: `你是一位小红书探店博主。根据大纲创作一篇「探店体验」笔记，要求：
- 氛围感描述，沉浸式体验
- emoji丰富✨📍💕🔥
- 从环境→体验→推荐逐步展开
- 短句跳跃感，清单体
- 结尾"值得去吗？答案在评论区～"
- 标签5-8个
- 保持HTML格式输出`,
  },
};

export async function generateContentFromOutline(
  input: GenerateContentInput,
): Promise<GenerateContentResult> {
  const formatPrompt = FORMAT_PROMPTS[input.platform]?.[input.formatId]
    || `根据大纲生成${input.platformName}风格的完整内容`;

  const raw = await chat([
    {
      role: 'system',
      content: `${formatPrompt}\n\n请严格按以下JSON格式返回，不要包含任何其他文字：\n{"title":"生成的标题","htmlBody":"生成的HTML正文","tags":["标签1","标签2","标签3"]}`,
    },
    {
      role: 'user',
      content: `话题：${input.outline.topic}\n\n大纲要点：\n${input.outline.points}\n\n风格偏好：${input.outline.style || '无特殊要求'}\n\n请基于以上大纲，以「${input.formatName}」格式创作一篇完整的${input.platformName}内容，返回JSON。`,
    },
  ], 0.8);

  return parseJsonResponse<GenerateContentResult>(raw, {
    title: input.outline.topic,
    htmlBody: `<p>生成失败，请重试</p>`,
    tags: [],
  }, ['title', 'htmlBody']);
}

export async function generateContentFromOutlineStream(
  input: GenerateContentInput,
  onTitle: (title: string) => void,
  onToken: (token: string) => void,
): Promise<GenerateContentResult> {
  const formatPrompt = FORMAT_PROMPTS[input.platform]?.[input.formatId]
    || `根据大纲生成${input.platformName}风格的完整内容`;

  let fullRaw = '';

  await streamChat([
    {
      role: 'system',
      content: `${formatPrompt}\n\n请严格按以下JSON格式返回，不要包含任何其他文字：\n{"title":"生成的标题","htmlBody":"生成的HTML正文","tags":["标签1","标签2","标签3"]}`,
    },
    {
      role: 'user',
      content: `话题：${input.outline.topic}\n\n大纲要点：\n${input.outline.points}\n\n风格偏好：${input.outline.style || '无特殊要求'}\n\n请基于以上大纲，以「${input.formatName}」格式创作一篇完整的${input.platformName}内容，返回JSON。`,
    },
  ], {
    onToken: (token) => {
      fullRaw += token;
      // Try to extract partial title/htmlBody for live preview
      onToken(token);
    },
    onComplete: () => {},
    onError: (err) => { throw err; },
  }, 0.8);

  const result = parseJsonResponse<GenerateContentResult>(fullRaw, {
    title: input.outline.topic,
    htmlBody: `<p>生成失败，请重试</p>`,
    tags: [],
  }, ['title', 'htmlBody']);

  onTitle(result.title);
  return result;
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
