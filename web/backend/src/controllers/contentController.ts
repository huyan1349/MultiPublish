import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResponse(row: any) {
  return { ...row, tags: JSON.parse(row.tags) as string[] };
}

const prisma = new PrismaClient();

export async function create(req: Request, res: Response) {
  try {
    const { title, rawMarkdown, tags, coverImage, summary } = req.body;
    const content = await prisma.content.create({
      data: {
        title: title || '',
        rawMarkdown: rawMarkdown || '',
        summary: summary || null,
        tags: JSON.stringify(tags || []),
        coverImage: coverImage || null,
      },
    });
    res.status(201).json(toResponse(content));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create content' });
  }
}

export async function list(_req: Request, res: Response) {
  try {
    const contents = await prisma.content.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(contents.map(toResponse));
  } catch (err) {
    res.status(500).json({ error: 'Failed to list contents' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id as string },
    });
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    res.json(toResponse(content));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get content' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { title, rawMarkdown, tags, coverImage, summary } = req.body;
    const content = await prisma.content.update({
      where: { id: req.params.id as string },
      data: {
        ...(title !== undefined && { title }),
        ...(rawMarkdown !== undefined && { rawMarkdown }),
        ...(summary !== undefined && { summary }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(coverImage !== undefined && { coverImage }),
      },
    });
    res.json(toResponse(content));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update content' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    await prisma.content.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
}
