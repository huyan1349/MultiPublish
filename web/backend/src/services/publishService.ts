import { PrismaClient } from '@prisma/client';
import { mockPublish, type PublishResult } from '../publishers/MockPublisher.js';
import type { PlatformType } from '../types.js';

const prisma = new PrismaClient();

export async function publishOutput(outputId: string): Promise<PublishResult> {
  const output = await prisma.platformOutput.findUnique({ where: { id: outputId } });
  if (!output) throw new Error(`Output ${outputId} not found`);

  const result = mockPublish(
    output.platform as PlatformType,
    output.platformName,
    outputId,
  );

  await prisma.platformOutput.update({
    where: { id: outputId },
    data: { status: 'published' },
  });

  await prisma.publishRecord.create({
    data: {
      outputId,
      contentId: output.contentId,
      platform: output.platform,
      platformName: output.platformName,
      status: result.status,
      message: result.message,
      mockUrl: result.mockUrl || null,
    },
  });

  return result;
}

export async function batchPublish(outputIds: string[]): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  for (const id of outputIds) {
    try {
      const result = await publishOutput(id);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        platform: 'wechat',
        platformName: 'unknown',
        status: 'failed',
        message,
        publishedAt: new Date().toISOString(),
      });
    }
  }
  return results;
}

export async function createPublishRecord(params: {
  contentId: string; platform: string; platformName: string;
  status: string; message: string; mockUrl?: string;
}) {
  return prisma.publishRecord.create({
    data: {
      outputId: null, // real extension publish, not linked to a specific output
      contentId: params.contentId,
      platform: params.platform,
      platformName: params.platformName,
      status: params.status,
      message: params.message,
      mockUrl: params.mockUrl || null,
    },
  });
}

export async function getPublishRecords(contentId?: string) {
  const where = contentId ? { contentId } : {};
  const records = await prisma.publishRecord.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
  });
  return records;
}
