import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UpdateBlockSchema, ReorderBlocksSchema } from '@noteflow/shared';

const router = Router();
const prisma = new PrismaClient();

// PATCH /blocks/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const result = UpdateBlockSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors }) as any;

  try {
    const block = await prisma.block.update({
      where: { id: req.params.id },
      data: result.data,
    });
    res.json(block);
  } catch (e) {
    res.status(404).json({ error: 'Block not found' });
  }
});

// DELETE /blocks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.block.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    res.status(404).json({ error: 'Block not found' });
  }
});

// POST /blocks/reorder
router.post('/reorder', async (req: Request, res: Response) => {
  const result = ReorderBlocksSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors }) as any;

  try {
    await prisma.$transaction(
      result.data.blocks.map(b =>
        prisma.block.update({
          where: { id: b.id },
          data: { position: b.position, parentBlockId: b.parentBlockId ?? undefined },
        })
      )
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to reorder blocks' });
  }
});

export default router;
