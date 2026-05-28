# CLAUDE.md

> This file provides persistent project instructions for Claude Code and other AI coding agents.
> Claude should read this file before making changes in this repository.
> The project is a 72-hour practical challenge. Development process quality, PR quality, commit distribution, demo clarity, and runnable code are as important as the product itself.

---

## 0. Operating Mode

You are working on a project named **ContentBridge 多平台内容发布工具**.

Your role is not only to write code. You must act as:

1. Product planner
2. Full-stack engineer
3. Architecture reviewer
4. QA tester
5. README maintainer
6. Demo-preparation assistant
7. Competition-compliance checker

Always optimize for:

1. A working demo
2. Clear architecture
3. Small PRs
4. Frequent commits
5. Honest README documentation
6. Maintainable code
7. No plagiarism
8. No fake functionality

Do not over-engineer. This is a 72-hour project, not a six-month SaaS platform.

---

## 1. Project Summary

### 1.1 Project Name

**ContentBridge 多平台内容发布工具**

### 1.2 One-Sentence Pitch

ContentBridge helps creators write once, automatically adapt content for WeChat Official Account, Zhihu, Bilibili, and Xiaohongshu, then preview, edit, and simulate one-click publishing.

### 1.3 Core Problem

Creators often need to publish the same content across multiple platforms, but each platform has different:

1. Title style
2. Body format
3. Tone
4. Tags
5. Cover requirements
6. Summary requirements
7. Publishing fields
8. User expectations

Manual adaptation causes repeated low-value work.

### 1.4 Core Solution

The system converts one piece of original content into a platform-independent standard content model, then uses platform adapters to generate platform-specific outputs.

Main concept:

```text
One input
  -> StandardContent
  -> PlatformAdapter
  -> PlatformOutput
  -> Preview/Edit
  -> Mock Publish
  -> PublishRecord
```

---

## 2. Competition Requirements

### 2.1 Required Deliverables

The final repository must include:

1. Public GitHub or Gitee repository
2. Runnable source code
3. README.md
4. Demo video link in README
5. Clear commit history
6. Clear PR history
7. Frontend and backend under the same repository if both exist

### 2.2 Validity Rules

The work must be independently completed.

The development process must show continuous delivery. Do not import all code at the end.

All commits must be inside the selected competition batch time window.

A submission may be invalid if:

1. PR descriptions are empty.
2. PR descriptions do not match actual changes.
3. Third-party libraries are used but not listed in README.
4. Reused old code is not disclosed in PR descriptions.
5. Code is plagiarized.
6. Code similarity is too high.
7. Main branch cannot run after PR merge.
8. The repository was not created after the official start.

### 2.3 Judging Weights

The project should be optimized around:

1. Product completeness and innovation: 40%
2. Development process and code quality: 40%
3. Demo and presentation: 20%

Therefore, do not only chase features. PR quality, README quality, code clarity, and demo quality are first-class deliverables.

---

## 3. MVP Scope

### 3.1 Must Have

Implement the following as the MVP:

1. Create original content.
2. Input title, body, tags, and optional cover image URL.
3. Select target platforms.
4. Generate adapted versions for:
   - WeChat Official Account
   - Zhihu
   - Bilibili
   - Xiaohongshu
5. Each platform output must have visibly different style and fields.
6. Preview all adapted versions.
7. Edit platform output.
8. Validate basic platform constraints.
9. Simulate one-click publishing.
10. Store and display publish records.
11. Provide sample demo content.
12. Provide README with setup instructions, feature list, dependency list, originality statement, and demo video link placeholder.

### 3.2 Nice to Have

Only after the MVP is stable, add:

1. Markdown editor
2. Local draft autosave
3. Export platform output as Markdown or text
4. Platform style selector
5. Better mock AI rewrite templates
6. Demo mode button
7. Dark mode
8. Screenshot assets for README
9. Unit tests for adapters
10. Seed data script

### 3.3 Do Not Build in MVP

Do not spend time on:

1. Real OAuth login for platforms
2. Real WeChat/Zhihu/Bilibili/Xiaohongshu publishing API
3. Payment system
4. Multi-tenant organization system
5. Complex permission system
6. Kubernetes
7. Microservices
8. Redis/Kafka queues
9. Real video upload
10. Real image processing pipeline

---

## 4. Recommended Tech Stack

### 4.1 Preferred Stack

Use a TypeScript-first stack.

Frontend:

```text
React
TypeScript
Vite
Tailwind CSS
React Router
Zustand or React Context
Markdown rendering library
```

Backend:

```text
Node.js
TypeScript
Express
Prisma
SQLite
```

Package manager:

```text
pnpm
```

### 4.2 Acceptable Simplification

If time is limited, use JSON file storage instead of SQLite.

However, keep service boundaries clean so storage can be replaced later.

### 4.3 Avoid

Avoid introducing heavy dependencies that are not necessary for the demo.

Every dependency must be listed in README.

---

## 5. Repository Structure

Use a single repository with separated frontend and backend folders.

```text
content-bridge/
├── README.md
├── CLAUDE.md
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── docs/
│   ├── project-plan.md
│   ├── architecture.md
│   ├── api.md
│   ├── pr-guideline.md
│   └── demo-script.md
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── types/
│       ├── utils/
│       └── styles/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── adapters/
│       ├── publishers/
│       ├── models/
│       └── utils/
└── demo-assets/
    ├── screenshots/
    └── sample-content.md
```

---

## 6. Architecture Principles

### 6.1 Core Architecture

Use this flow:

```text
Frontend
  -> API Routes
  -> ContentService
  -> ParserService
  -> AdapterService
  -> PlatformAdapter
  -> PublishService
  -> MockPublisher
  -> Storage
```

### 6.2 Key Design Principle

The most important architecture idea is:

```text
Standard content model + platform adapter pattern
```

Do not write platform-specific logic everywhere.

Keep platform-specific logic inside adapter files.

### 6.3 Module Responsibilities

#### ContentService

Handles original content:

1. Create content
2. Update content
3. List content
4. Get content detail
5. Delete content

#### ParserService

Converts raw Markdown/text into structured content blocks.

#### AdapterService

Calls selected platform adapters and stores outputs.

#### PlatformAdapter

Converts StandardContent into platform-specific PlatformOutputDraft.

#### PublishService

Publishes or mock-publishes platform outputs.

#### MockPublisher

Generates simulated publishing results and mock URLs.

---

## 7. Data Models

### 7.1 PlatformType

```ts
export type PlatformType =
  | "wechat"
  | "zhihu"
  | "bilibili"
  | "xiaohongshu";
```

### 7.2 StandardContent

```ts
export interface StandardContent {
  id: string;
  title: string;
  summary?: string;
  rawMarkdown: string;
  blocks: ContentBlock[];
  tags: string[];
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 7.3 ContentBlock

```ts
export type ContentBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    }
  | {
      type: "quote";
      text: string;
    }
  | {
      type: "image";
      url: string;
      caption?: string;
    };
```

### 7.4 PlatformOutput

```ts
export interface PlatformOutput {
  id: string;
  contentId: string;
  platform: PlatformType;
  platformName: string;
  title: string;
  summary?: string;
  body: string;
  tags: string[];
  coverImage?: string;
  extra?: Record<string, unknown>;
  status: "draft" | "ready" | "publishing" | "published" | "failed";
  validationMessages: ValidationMessage[];
  createdAt: string;
  updatedAt: string;
}
```

### 7.5 ValidationMessage

```ts
export interface ValidationMessage {
  level: "info" | "warning" | "error";
  field: string;
  message: string;
}
```

### 7.6 PublishRecord

```ts
export interface PublishRecord {
  id: string;
  outputId: string;
  contentId: string;
  platform: PlatformType;
  platformName: string;
  status: "success" | "failed";
  message: string;
  mockUrl?: string;
  publishedAt: string;
}
```

---

## 8. Platform Adapter Design

### 8.1 Required Interface

Create:

```text
backend/src/adapters/PlatformAdapter.ts
```

Use:

```ts
export interface PlatformAdapter {
  platform: PlatformType;
  displayName: string;

  validate(content: StandardContent): ValidationResult;

  transform(content: StandardContent): PlatformOutputDraft;

  getPreviewMeta(output: PlatformOutputDraft): PreviewMeta;
}
```

### 8.2 Adapter Files

Create one file per platform:

```text
backend/src/adapters/WechatAdapter.ts
backend/src/adapters/ZhihuAdapter.ts
backend/src/adapters/BilibiliAdapter.ts
backend/src/adapters/XiaohongshuAdapter.ts
```

### 8.3 AdapterFactory

Create:

```text
backend/src/adapters/AdapterFactory.ts
```

It should register and retrieve adapters.

### 8.4 Platform Extension Rule

To add a new platform, the developer should only need to:

1. Add a new adapter file.
2. Register it in AdapterFactory.
3. Add platform metadata/config.
4. Add frontend platform option.
5. Add README documentation.

Avoid changing existing adapter internals.

---

## 9. Platform-Specific Rules

### 9.1 WeChat Official Account

Style:

1. Formal
2. Structured
3. Clear subheadings
4. Suitable for long-form reading
5. Less tag-driven

Generate:

1. Formal title
2. 80-120 character digest
3. Structured body
4. Ending summary
5. Optional cover image field

Example title transformation:

```text
Original: 我做了一个多平台内容发布工具
WeChat: 从一次创作到多端发布：多平台内容发布工具的设计与实现
```

### 9.2 Zhihu

Style:

1. Rational
2. Analytical
3. Question-driven
4. Conclusion first
5. Less marketing tone

Generate:

1. Question-style or argument-style title
2. Body with structure:
   - Conclusion
   - Background
   - Problem
   - Solution
   - Summary
3. 3-5 topic tags

Example title transformation:

```text
Original: 我做了一个多平台内容发布工具
Zhihu: 如何设计一个能自动适配多平台的内容发布工具？
```

### 9.3 Bilibili

Style:

1. Video-oriented
2. Clear hook
3. Brief introduction
4. Tags matter
5. Timeline can be generated

Generate:

1. Video title
2. Video description
3. 5-8 tags
4. Timeline
5. Cover slogan
6. Category, fixed as knowledge/technology in MVP

Example title transformation:

```text
Original: 我做了一个多平台内容发布工具
Bilibili: 我做了一个“一键发全平台”的内容发布工具
```

### 9.4 Xiaohongshu

Style:

1. Short title
2. Benefit-oriented
3. Pain-point driven
4. Light and conversational
5. Bullet points
6. Hashtags
7. Moderate emoji allowed

Generate:

1. Short note title
2. Conversational note body
3. 5-10 hashtags
4. Cover text
5. Action-oriented ending

Example title transformation:

```text
Original: 我做了一个多平台内容发布工具
Xiaohongshu: 一篇内容发全平台！
```

---

## 10. API Design

### 10.1 Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

### 10.2 Content APIs

#### Create Content

```http
POST /api/contents
```

Request:

```json
{
  "title": "我做了一个多平台内容发布工具",
  "rawMarkdown": "很多创作者需要在多个平台同步发布内容...",
  "tags": ["内容创作", "效率工具"],
  "coverImage": ""
}
```

#### List Contents

```http
GET /api/contents
```

#### Get Content Detail

```http
GET /api/contents/:id
```

#### Update Content

```http
PUT /api/contents/:id
```

#### Delete Content

```http
DELETE /api/contents/:id
```

### 10.3 Adapt APIs

#### Generate Platform Outputs

```http
POST /api/contents/:id/adapt
```

Request:

```json
{
  "platforms": ["wechat", "zhihu", "bilibili", "xiaohongshu"]
}
```

#### Update Platform Output

```http
PUT /api/platform-outputs/:id
```

### 10.4 Publish APIs

#### Publish One Output

```http
POST /api/platform-outputs/:id/publish
```

#### Batch Publish

```http
POST /api/publish/batch
```

Request:

```json
{
  "outputIds": ["output_001", "output_002"]
}
```

#### List Publish Records

```http
GET /api/publish-records
```

---

## 11. Frontend Pages

### 11.1 Dashboard

Route:

```text
/
```

Must show:

1. Project title
2. Supported platforms
3. Recent contents
4. Publish statistics
5. Button to create new content

### 11.2 Editor

Route:

```text
/editor
/editor/:id
```

Must include:

1. Title input
2. Body input
3. Tags input
4. Cover image URL input
5. Platform selector
6. Generate button
7. Demo content autofill button

### 11.3 Preview

Route:

```text
/contents/:id/preview
```

Must include:

1. Platform tabs
2. Platform-specific preview
3. Editable title
4. Editable body
5. Editable tags
6. Validation messages
7. Single publish button
8. Batch publish button

### 11.4 Publish Records

Route:

```text
/publish-records
```

Must include:

1. Content title
2. Platform
3. Status
4. Mock URL
5. Publish time
6. Message

---

## 12. Development Plan: 72 Hours

### 12.1 General Rules

Each PR must do exactly one logical thing.

After every PR merge, the main branch must remain runnable.

Use small commits with meaningful messages.

Do not make one massive final commit.

### 12.2 Day 1: Foundation

Goal: project skeleton and runnable frontend/backend.

Suggested PRs:

#### PR 1: Initialize repository documentation

Scope:

1. Add README initial version.
2. Add CLAUDE.md.
3. Add .gitignore.
4. Add docs directory.
5. Add demo-assets directory.

Testing:

```bash
ls
cat README.md
```

#### PR 2: Initialize frontend

Scope:

1. Create Vite React TypeScript app.
2. Add basic routing.
3. Add Dashboard placeholder.
4. Add basic layout.

Testing:

```bash
cd frontend
pnpm install
pnpm dev
```

#### PR 3: Initialize backend

Scope:

1. Create Express TypeScript backend.
2. Add health check.
3. Add dev script.
4. Add CORS config.

Testing:

```bash
cd backend
pnpm install
pnpm dev
curl http://localhost:3000/health
```

#### PR 4: Add shared domain types

Scope:

1. Add PlatformType.
2. Add StandardContent.
3. Add ContentBlock.
4. Add PlatformOutput.
5. Add PublishRecord.

Testing:

```bash
pnpm typecheck
```

#### PR 5: Implement content CRUD basics

Scope:

1. POST /api/contents.
2. GET /api/contents.
3. GET /api/contents/:id.
4. JSON or SQLite storage.

Testing:

```bash
curl -X POST http://localhost:3000/api/contents
curl http://localhost:3000/api/contents
```

### 12.3 Day 2: Core Adaptation

Goal: generate different platform outputs.

Suggested PRs:

#### PR 6: Implement parser service

Scope:

1. Parse title, paragraphs, headings, lists, quotes.
2. Convert rawMarkdown to ContentBlock[].

Testing:

1. Create content with Markdown.
2. Verify structured blocks.

#### PR 7: Implement adapter interface and factory

Scope:

1. Add PlatformAdapter interface.
2. Add AdapterFactory.
3. Register platform adapters with placeholder transforms.

Testing:

1. Request adaptation for selected platforms.
2. Confirm each selected adapter is called.

#### PR 8: Implement four platform adapters

Scope:

1. WeChatAdapter
2. ZhihuAdapter
3. BilibiliAdapter
4. XiaohongshuAdapter

Testing:

1. Same input should produce visibly different outputs.
2. Each platform should have different title/body/tags/extra fields.

#### PR 9: Implement adaptation API

Scope:

1. POST /api/contents/:id/adapt.
2. Store PlatformOutput.
3. Return outputs.

Testing:

```bash
curl -X POST http://localhost:3000/api/contents/{id}/adapt
```

#### PR 10: Implement preview UI

Scope:

1. Platform tabs.
2. Display adapted output.
3. Show validation messages.
4. Allow editing output.

Testing:

1. Create content.
2. Generate outputs.
3. Switch between platform previews.
4. Edit title/body/tags.

### 12.4 Day 3: Publishing, Polish, Demo

Goal: finish publishing flow and documentation.

Suggested PRs:

#### PR 11: Implement mock publishing

Scope:

1. MockPublisher.
2. PublishService.
3. Single publish endpoint.
4. Batch publish endpoint.
5. PublishRecord creation.

Testing:

1. Publish one output.
2. Batch publish all outputs.
3. Verify records generated.

#### PR 12: Implement publish records page

Scope:

1. Fetch publish records.
2. Show platform, title, status, mock URL, time.
3. Link from navigation.

Testing:

1. Publish outputs.
2. Check records page.

#### PR 13: Add demo mode and sample content

Scope:

1. Add autofill demo content button.
2. Add demo sample Markdown.
3. Add screenshots if available.

Testing:

1. Click autofill.
2. Generate four platform outputs.
3. Publish successfully.

#### PR 14: Improve README and docs

Scope:

1. Add project intro.
2. Add feature list.
3. Add tech stack.
4. Add dependency list.
5. Add setup instructions.
6. Add architecture explanation.
7. Add originality statement.
8. Add demo video link placeholder.

Testing:

1. New reviewer can follow README to run project.

#### PR 15: Final QA and demo preparation

Scope:

1. Fix bugs.
2. Polish UI.
3. Add demo script.
4. Ensure main branch runs.
5. Confirm README has demo link placeholder.

Testing:

1. Fresh clone.
2. Install.
3. Run frontend/backend.
4. Complete demo flow.

---

## 13. PR Template

Every PR description must include:

```md
## Title

One sentence describing what this PR changes.

## Feature Description

Explain what this feature does and how users/developers use it.

## Implementation Notes

Explain the technical approach, important files, and core logic.

## Testing

List exact commands or manual steps used to verify the change.

## Originality / Source Note

State whether this PR is fully original. If any previous code or external reference is used, disclose it here.
```

---

## 14. Commit Message Rules

Use clear commit messages.

Recommended format:

```text
feat: add content creation api
feat: implement xiaohongshu adapter
fix: handle empty tag input
docs: update readme setup instructions
test: add adapter unit tests
chore: initialize frontend workspace
```

Do not use vague messages:

```text
update
fix
final
aaa
change
```

---

## 15. README Requirements

README.md must include:

1. Project name
2. Project background
3. Core features
4. Supported platforms
5. Architecture overview
6. Tech stack
7. Directory structure
8. Installation steps
9. Run commands
10. Demo flow
11. Demo video link
12. Dependency list
13. Originality statement
14. Known limitations
15. Future extension plan

README must make it obvious what was independently implemented.

---

## 16. Demo Video Script

The demo video must include voice explanation.

Recommended structure:

### 16.1 Opening

Explain:

1. Project name
2. Problem
3. Target users
4. Core value

Suggested wording:

```text
大家好，这是我的项目 ContentBridge 多平台内容发布工具。
它解决的是创作者在公众号、知乎、B站、小红书等平台同步发布内容时，需要反复调整格式和风格的问题。
本项目支持一次输入内容，自动生成多个平台版本，并支持预览、编辑和模拟发布。
```

### 16.2 Feature Demo

Show:

1. Dashboard
2. Create content
3. Fill title/body/tags
4. Select platforms
5. Generate adapted versions
6. Switch WeChat/Zhihu/Bilibili/Xiaohongshu previews
7. Edit one platform output
8. Batch mock publish
9. Open publish records

### 16.3 Architecture Explanation

Explain:

1. StandardContent model
2. PlatformAdapter pattern
3. MockPublisher
4. How to extend new platforms

### 16.4 Closing

Explain:

1. Current MVP scope
2. Why real publishing is simulated
3. Future platform extension plan
4. README includes setup and dependency information

---

## 17. Testing Checklist

Before final submission, verify:

### 17.1 Frontend

1. Dashboard loads.
2. Editor loads.
3. Demo content autofill works.
4. Platform selection works.
5. Generate button works.
6. Preview page works.
7. Platform tabs work.
8. Editing output works.
9. Batch publish works.
10. Publish records page works.

### 17.2 Backend

1. GET /health returns ok.
2. POST /api/contents works.
3. GET /api/contents works.
4. GET /api/contents/:id works.
5. POST /api/contents/:id/adapt works.
6. PUT /api/platform-outputs/:id works.
7. POST /api/platform-outputs/:id/publish works.
8. POST /api/publish/batch works.
9. GET /api/publish-records works.

### 17.3 Documentation

1. README is complete.
2. Dependencies are listed.
3. Originality statement exists.
4. Demo video link exists or placeholder is obvious before final upload.
5. Architecture is explained.
6. Setup commands are correct.
7. Known limitations are honest.

### 17.4 Competition Compliance

1. Repository created after official start.
2. PRs are small and meaningful.
3. PR descriptions are complete.
4. Commits are distributed across the development window.
5. Main branch remains runnable.
6. No old code reused without disclosure.
7. No third-party dependency omitted from README.
8. Demo video is accessible.
9. README link to demo video is visible near the top.

---

## 18. Risk Control

### 18.1 Real Platform API Risk

Do not depend on real platform APIs. Many platforms have strict authentication, review, or private interface limitations.

Use mock publishing for MVP.

Explain in README:

```text
Due to platform API permission and review limitations, this project implements a mock publishing workflow. The architecture preserves a Publisher interface, allowing future replacement with real platform API integrations.
```

### 18.2 Time Risk

If time is short, prioritize:

1. Core adaptation
2. Preview
3. Mock publishing
4. README
5. Demo video

Do not waste time on cosmetic details before the main flow works.

### 18.3 AI Feature Risk

Do not depend on live LLM APIs for core demo.

Use deterministic templates for platform style transformation.

Optional LLM integration can be described as a future extension.

### 18.4 Storage Risk

If Prisma/SQLite setup consumes too much time, switch to JSON file storage.

Keep service interfaces stable.

### 18.5 UI Risk

A clean and stable UI is better than a fancy but broken UI.

---

## 19. Implementation Rules for Claude

When implementing code:

1. Prefer small changes.
2. Keep files organized.
3. Avoid unrelated refactors.
4. Do not silently delete existing features.
5. Keep TypeScript types explicit.
6. Add comments only where helpful.
7. Do not add unused dependencies.
8. Do not invent real platform API credentials.
9. Do not pretend mock publishing is real publishing.
10. Always update README when adding setup requirements.
11. Always keep the app runnable after each logical step.
12. Always mention testing steps in PR descriptions.
13. If a requirement is ambiguous, choose the simplest working approach and document the assumption.
14. If build/test fails, fix it before adding more features.

---

## 20. Suggested Development Commands

Root:

```bash
pnpm install
pnpm dev
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev
pnpm build
```

Backend:

```bash
cd backend
pnpm install
pnpm dev
pnpm build
```

Testing health endpoint:

```bash
curl http://localhost:3000/health
```

---

## 21. Example Demo Content

Use this as sample content:

```md
# 我做了一个多平台内容发布工具

很多创作者需要在公众号、知乎、B站、小红书等平台同步发布内容，但每个平台的格式、语气和发布字段都不一样。

公众号更适合正式长文，知乎更强调逻辑分析，B站需要视频简介和标签，小红书则更偏向短标题、清单式表达和话题标签。

因此，我设计了 ContentBridge，希望实现一次输入、多端适配、统一预览和模拟发布。

## 核心功能

- 输入原始内容
- 自动识别标题、段落和标签
- 生成不同平台版本
- 支持预览和编辑
- 支持批量模拟发布
- 支持发布记录管理

## 架构设计

系统采用标准内容模型和平台适配器模式。新增平台时，只需要增加新的 Adapter，而不需要重写整个系统。

## 总结

ContentBridge 的目标不是简单复制粘贴，而是让内容在不同平台中保持一致表达，同时适配各自的平台生态。
```

---

## 22. Expected Final Demo Flow

The finished demo should allow this exact flow:

1. Open Dashboard.
2. Click create content.
3. Autofill demo content.
4. Select WeChat, Zhihu, Bilibili, Xiaohongshu.
5. Click generate.
6. See four adapted outputs.
7. Switch tabs and observe different styles.
8. Edit Xiaohongshu title.
9. Click batch mock publish.
10. Open publish records.
11. See four successful mock publish records.

If this flow works smoothly, the project is acceptable.

---

## 23. Final Submission Checklist

Before final submission:

1. Repository is public or will be public after deadline according to rules.
2. README has visible demo video link.
3. Demo video is playable.
4. Main branch runs from fresh clone.
5. PR list shows continuous development.
6. Commit history is not concentrated only on the final day.
7. All dependencies are declared.
8. Originality statement is present.
9. Mock publishing is clearly labeled.
10. Architecture extension plan is documented.
11. Screenshots are included if possible.
12. No secrets or private API tokens are committed.

---

## 24. Final Reminder for Claude

Build the smallest complete product first.

The winning shape is:

```text
Clear product problem
+ Working end-to-end demo
+ Adapter-based architecture
+ Visible platform differences
+ Honest mock publishing
+ Good README
+ Good PR history
+ Good demo video
```

Do not chase a giant castle. Build a sharp little lighthouse.
