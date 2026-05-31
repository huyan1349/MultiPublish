import type { PlatformType, PlatformOutputDraft } from '../adapters/PlatformAdapter.js';
import { getAdapter, listAdapters } from '../adapters/AdapterFactory.js';
import { parseToBlocks } from './parserService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AdaptationResult {
  platform: PlatformType;
  platformName: string;
  output: PlatformOutputDraft;
  status: 'success' | 'error';
  error?: string;
}

export async function adaptContent(
  contentId: string,
  platforms: PlatformType[],
): Promise<AdaptationResult[]> {
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new Error(`Content ${contentId} not found`);

  const blocks = parseToBlocks(content.rawMarkdown);
  const standardContent = {
    id: content.id,
    title: content.title,
    summary: content.summary || undefined,
    rawMarkdown: content.rawMarkdown,
    blocks,
    tags: JSON.parse(content.tags) as string[],
    coverImage: content.coverImage || undefined,
  };

  const results: AdaptationResult[] = [];

  for (const platform of platforms) {
    try {
      const adapter = getAdapter(platform);
      const draft = adapter.transform(standardContent);

      // Save to DB
      const existing = await prisma.platformOutput.findFirst({
        where: { contentId, platform },
      });

      const data = {
        platform,
        platformName: adapter.displayName,
        title: draft.title,
        summary: draft.summary || null,
        body: draft.body,
        tags: JSON.stringify(draft.tags),
        coverImage: draft.coverImage || null,
        extra: JSON.stringify(draft.extra || {}),
        status: 'ready',
        validationMessages: JSON.stringify([]),
      };

      if (existing) {
        await prisma.platformOutput.update({ where: { id: existing.id }, data });
      } else {
        await prisma.platformOutput.create({ data: { ...data, contentId } });
      }

      results.push({ platform, platformName: adapter.displayName, output: draft, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ platform, platformName: platform, output: {} as PlatformOutputDraft, status: 'error', error: message });
    }
  }

  return results;
}

export async function getPlatformOutputs(contentId: string) {
  const outputs = await prisma.platformOutput.findMany({
    where: { contentId },
    orderBy: { createdAt: 'asc' },
  });
  return outputs.map((o) => ({
    ...o,
    tags: JSON.parse(o.tags) as string[],
    extra: JSON.parse(o.extra || '{}'),
    validationMessages: JSON.parse(o.validationMessages || '[]'),
  }));
}

export async function updatePlatformOutput(outputId: string, data: {
  title?: string; body?: string; tags?: string[]; summary?: string;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.summary !== undefined) updateData.summary = data.summary;
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

  return prisma.platformOutput.update({
    where: { id: outputId },
    data: updateData,
  });
}
