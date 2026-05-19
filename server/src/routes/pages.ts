import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreatePageSchema, UpdatePageSchema, CreateBlockSchema } from '@noteflow/shared';

const router = Router();
const prisma = new PrismaClient();

// Build nested tree from flat list
function buildTree(pages: any[], parentId: string | null = null): any[] {
  return pages
    .filter(p => p.parentId === parentId)
    .sort((a, b) => a.position - b.position)
    .map(p => ({ ...p, children: buildTree(pages, p.id) }));
}

// GET /pages - full page tree
router.get('/', async (req: Request, res: Response) => {
  try {
    const pages = await prisma.page.findMany();
    const tree = buildTree(pages);
    res.json(tree);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// GET /pages/:id - page with blocks
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const page = await prisma.page.findUnique({
      where: { id: req.params.id },
      include: {
        blocks: { orderBy: { position: 'asc' } }
      }
    });
    if (!page) return res.status(404).json({ error: 'Page not found' }) as any;
    res.json(page);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// POST /pages
router.post('/', async (req: Request, res: Response) => {
  const result = CreatePageSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors }) as any;

  try {
    // Find max position among siblings
    const siblings = await prisma.page.findMany({
      where: { parentId: result.data.parentId ?? null },
      orderBy: { position: 'desc' },
      take: 1,
    });
    const position = result.data.position ?? ((siblings[0]?.position ?? -1) + 1);

    const page = await prisma.page.create({
      data: {
        title: result.data.title ?? 'Untitled',
        icon: result.data.icon ?? null,
        parentId: result.data.parentId ?? null,
        position,
      }
    });
    res.status(201).json(page);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// PATCH /pages/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const result = UpdatePageSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors }) as any;

  try {
    const page = await prisma.page.update({
      where: { id: req.params.id },
      data: result.data,
    });
    res.json(page);
  } catch (e) {
    res.status(404).json({ error: 'Page not found' });
  }
});

// DELETE /pages/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.page.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    res.status(404).json({ error: 'Page not found' });
  }
});

// POST /pages/:id/blocks
router.post('/:id/blocks', async (req: Request, res: Response) => {
  const result = CreateBlockSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors }) as any;

  try {
    const block = await prisma.block.create({
      data: {
        pageId: req.params.id,
        type: result.data.type,
        content: result.data.content,
        checked: result.data.checked,
        language: result.data.language ?? null,
        position: result.data.position,
        parentBlockId: result.data.parentBlockId ?? null,
      }
    });
    res.status(201).json(block);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create block' });
  }
});

export default router;
