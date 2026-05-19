import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const force = process.argv.includes('--force');

async function main() {
  if (force) {
    console.log('--force: wiping existing data...');
    await prisma.block.deleteMany();
    await prisma.page.deleteMany();
  }

  // Upsert pages by title+parentId to avoid duplicates
  const root = await prisma.page.upsert({
    where: { id: 'seed-getting-started' },
    update: { title: 'Getting Started', icon: null, position: 0 },
    create: { id: 'seed-getting-started', title: 'Getting Started', icon: null, position: 0 },
  });

  await upsertBlocks(root.id, [
    { id: 'seed-b1', type: 'heading1', content: 'Welcome to NoteFlow', position: 0 },
    { id: 'seed-b2', type: 'paragraph', content: 'NoteFlow is a simplified Notion clone. Use the sidebar to navigate between pages, and try the slash command (/) to insert different block types.', position: 1 },
    { id: 'seed-b3', type: 'heading2', content: 'Features', position: 2 },
    { id: 'seed-b4', type: 'bulleted_list', content: 'Nested pages with a collapsible sidebar', position: 3 },
    { id: 'seed-b5', type: 'bulleted_list', content: 'Block-based editor with 11 block types', position: 4 },
    { id: 'seed-b6', type: 'bulleted_list', content: 'Drag and drop to reorder blocks', position: 5 },
    { id: 'seed-b7', type: 'bulleted_list', content: 'Dark mode support', position: 6 },
    { id: 'seed-b8', type: 'divider', content: '', position: 7 },
    { id: 'seed-b9', type: 'quote', content: 'The best way to predict the future is to create it.', position: 8 },
  ]);

  const meetings = await prisma.page.upsert({
    where: { id: 'seed-meeting-notes' },
    update: { title: 'Meeting Notes', icon: null, parentId: root.id, position: 0 },
    create: { id: 'seed-meeting-notes', title: 'Meeting Notes', icon: null, parentId: root.id, position: 0 },
  });

  await upsertBlocks(meetings.id, [
    { id: 'seed-m1', type: 'heading1', content: 'Q1 Planning Meeting', position: 0 },
    { id: 'seed-m2', type: 'paragraph', content: 'Date: January 15, 2024 | Attendees: Team', position: 1 },
    { id: 'seed-m3', type: 'heading2', content: 'Action Items', position: 2 },
    { id: 'seed-m4', type: 'todo', content: 'Set up project repository', checked: true, position: 3 },
    { id: 'seed-m5', type: 'todo', content: 'Schedule kickoff call', checked: true, position: 4 },
    { id: 'seed-m6', type: 'todo', content: 'Write technical spec', checked: false, position: 5 },
    { id: 'seed-m7', type: 'todo', content: 'Review design mockups', checked: false, position: 6 },
    { id: 'seed-m8', type: 'heading2', content: 'Notes', position: 7 },
    { id: 'seed-m9', type: 'numbered_list', content: 'Discussed project timeline and milestones', position: 8 },
    { id: 'seed-m10', type: 'numbered_list', content: 'Agreed on tech stack decisions', position: 9 },
    { id: 'seed-m11', type: 'numbered_list', content: 'Assigned responsibilities to team members', position: 10 },
  ]);

  const code = await prisma.page.upsert({
    where: { id: 'seed-code-snippets' },
    update: { title: 'Code Snippets', icon: null, parentId: root.id, position: 1 },
    create: { id: 'seed-code-snippets', title: 'Code Snippets', icon: null, parentId: root.id, position: 1 },
  });

  await upsertBlocks(code.id, [
    { id: 'seed-c1', type: 'heading1', content: 'Useful Code Snippets', position: 0 },
    { id: 'seed-c2', type: 'paragraph', content: 'A collection of useful code patterns and examples.', position: 1 },
    { id: 'seed-c3', type: 'heading2', content: 'TypeScript', position: 2 },
    { id: 'seed-c4', type: 'code', content: 'const greet = (name: string): string => {\n  return `Hello, ${name}!`;\n};\n\nconsole.log(greet("World"));', language: 'typescript', position: 3 },
    { id: 'seed-c5', type: 'heading2', content: 'Async/Await Pattern', position: 4 },
    { id: 'seed-c6', type: 'code', content: 'async function fetchData(url: string) {\n  try {\n    const response = await fetch(url);\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error("Error:", error);\n    throw error;\n  }\n}', language: 'typescript', position: 5 },
  ]);

  const toggleDemo = await prisma.page.upsert({
    where: { id: 'seed-block-types' },
    update: { title: 'Block Types Demo', icon: null, parentId: root.id, position: 2 },
    create: { id: 'seed-block-types', title: 'Block Types Demo', icon: null, parentId: root.id, position: 2 },
  });

  const toggleBlock = await prisma.block.upsert({
    where: { id: 'seed-toggle-block' },
    update: { type: 'toggle', content: 'Click to expand this toggle block', position: 0 },
    create: { id: 'seed-toggle-block', pageId: toggleDemo.id, type: 'toggle', content: 'Click to expand this toggle block', position: 0 },
  });

  await upsertBlocks(toggleDemo.id, [
    { id: 'seed-t-nested1', type: 'paragraph', content: 'This is nested content inside the toggle!', position: 0, parentBlockId: toggleBlock.id },
    { id: 'seed-t-nested2', type: 'bulleted_list', content: 'Nested bullet point 1', position: 1, parentBlockId: toggleBlock.id },
    { id: 'seed-t-nested3', type: 'bulleted_list', content: 'Nested bullet point 2', position: 2, parentBlockId: toggleBlock.id },
    { id: 'seed-t1', type: 'heading2', content: 'All Block Types', position: 1 },
    { id: 'seed-t2', type: 'paragraph', content: 'This is a paragraph block.', position: 2 },
    { id: 'seed-t3', type: 'heading1', content: 'Heading 1', position: 3 },
    { id: 'seed-t4', type: 'heading2', content: 'Heading 2', position: 4 },
    { id: 'seed-t5', type: 'heading3', content: 'Heading 3', position: 5 },
    { id: 'seed-t6', type: 'bulleted_list', content: 'Bulleted list item', position: 6 },
    { id: 'seed-t7', type: 'numbered_list', content: 'Numbered list item', position: 7 },
    { id: 'seed-t8', type: 'todo', content: 'Todo item (unchecked)', checked: false, position: 8 },
    { id: 'seed-t9', type: 'todo', content: 'Todo item (checked)', checked: true, position: 9 },
    { id: 'seed-t10', type: 'quote', content: 'This is a quote block with a left border.', position: 10 },
    { id: 'seed-t11', type: 'divider', content: '', position: 11 },
    { id: 'seed-t12', type: 'code', content: '// This is a code block\nconst x = 42;', language: 'javascript', position: 12 },
  ]);

  const personal = await prisma.page.upsert({
    where: { id: 'seed-personal-notes' },
    update: { title: 'Personal Notes', icon: null, position: 1 },
    create: { id: 'seed-personal-notes', title: 'Personal Notes', icon: null, position: 1 },
  });

  await upsertBlocks(personal.id, [
    { id: 'seed-p1', type: 'heading1', content: 'Personal Notes', position: 0 },
    { id: 'seed-p2', type: 'paragraph', content: 'Use this space for personal notes, ideas, and thoughts.', position: 1 },
  ]);

  console.log('✅ Database seeded successfully!');
}

type BlockData = {
  id: string;
  type: string;
  content: string;
  position: number;
  checked?: boolean;
  language?: string;
  parentBlockId?: string;
};

async function upsertBlocks(pageId: string, blocks: BlockData[]) {
  for (const b of blocks) {
    await prisma.block.upsert({
      where: { id: b.id },
      update: {
        type: b.type,
        content: b.content,
        position: b.position,
        checked: b.checked ?? false,
        language: b.language ?? null,
        parentBlockId: b.parentBlockId ?? null,
      },
      create: {
        id: b.id,
        pageId,
        type: b.type,
        content: b.content,
        position: b.position,
        checked: b.checked ?? false,
        language: b.language ?? null,
        parentBlockId: b.parentBlockId ?? null,
      },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
