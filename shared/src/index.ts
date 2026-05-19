import { z } from 'zod';

export const BlockTypeSchema = z.enum([
  'paragraph', 'heading1', 'heading2', 'heading3',
  'bulleted_list', 'numbered_list', 'todo', 'toggle',
  'code', 'divider', 'quote'
]);

export type BlockType = z.infer<typeof BlockTypeSchema>;

export const BlockSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  type: BlockTypeSchema,
  content: z.string(),
  checked: z.boolean(),
  language: z.string().nullable(),
  position: z.number(),
  parentBlockId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Block = z.infer<typeof BlockSchema>;

export const PageSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  parentId: z.string().nullable(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  children: z.lazy((): z.ZodArray<z.ZodTypeAny> => z.array(PageSchema)).optional(),
  blocks: z.array(BlockSchema).optional(),
});

export type Page = z.infer<typeof PageSchema>;

export const CreatePageSchema = z.object({
  title: z.string().default('Untitled'),
  icon: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().optional(),
});

export const UpdatePageSchema = z.object({
  title: z.string().optional(),
  icon: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().optional(),
});

export const CreateBlockSchema = z.object({
  type: BlockTypeSchema.default('paragraph'),
  content: z.string().default(''),
  checked: z.boolean().default(false),
  language: z.string().nullable().optional(),
  position: z.number(),
  parentBlockId: z.string().nullable().optional(),
});

export const UpdateBlockSchema = z.object({
  type: BlockTypeSchema.optional(),
  content: z.string().optional(),
  checked: z.boolean().optional(),
  language: z.string().nullable().optional(),
  position: z.number().optional(),
  parentBlockId: z.string().nullable().optional(),
});

export const ReorderBlocksSchema = z.object({
  blocks: z.array(z.object({
    id: z.string(),
    position: z.number(),
    parentBlockId: z.string().nullable().optional(),
  })),
});
