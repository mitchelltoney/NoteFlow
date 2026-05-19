import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.block.deleteMany();
  await prisma.page.deleteMany();

  // Root page: Getting Started
  const root = await prisma.page.create({
    data: { title: 'Getting Started', icon: '🚀', position: 0 }
  });

  // Create some blocks for root page
  await prisma.block.createMany({
    data: [
      { pageId: root.id, type: 'heading1', content: 'Welcome to NoteFlow', position: 0 },
      { pageId: root.id, type: 'paragraph', content: 'NoteFlow is a simplified Notion clone. Use the sidebar to navigate between pages, and try the slash command (/) to insert different block types.', position: 1 },
      { pageId: root.id, type: 'heading2', content: 'Features', position: 2 },
      { pageId: root.id, type: 'bulleted_list', content: 'Nested pages with a collapsible sidebar', position: 3 },
      { pageId: root.id, type: 'bulleted_list', content: 'Block-based editor with 11 block types', position: 4 },
      { pageId: root.id, type: 'bulleted_list', content: 'Drag and drop to reorder blocks', position: 5 },
      { pageId: root.id, type: 'bulleted_list', content: 'Dark mode support', position: 6 },
      { pageId: root.id, type: 'divider', content: '', position: 7 },
      { pageId: root.id, type: 'quote', content: 'The best way to predict the future is to create it.', position: 8 },
    ]
  });

  // Child page: Meeting Notes
  const meetings = await prisma.page.create({
    data: { title: 'Meeting Notes', icon: '📝', parentId: root.id, position: 0 }
  });

  await prisma.block.createMany({
    data: [
      { pageId: meetings.id, type: 'heading1', content: 'Q1 Planning Meeting', position: 0 },
      { pageId: meetings.id, type: 'paragraph', content: 'Date: January 15, 2024 | Attendees: Team', position: 1 },
      { pageId: meetings.id, type: 'heading2', content: 'Action Items', position: 2 },
      { pageId: meetings.id, type: 'todo', content: 'Set up project repository', checked: true, position: 3 },
      { pageId: meetings.id, type: 'todo', content: 'Schedule kickoff call', checked: true, position: 4 },
      { pageId: meetings.id, type: 'todo', content: 'Write technical spec', checked: false, position: 5 },
      { pageId: meetings.id, type: 'todo', content: 'Review design mockups', checked: false, position: 6 },
      { pageId: meetings.id, type: 'heading2', content: 'Notes', position: 7 },
      { pageId: meetings.id, type: 'numbered_list', content: 'Discussed project timeline and milestones', position: 8 },
      { pageId: meetings.id, type: 'numbered_list', content: 'Agreed on tech stack decisions', position: 9 },
      { pageId: meetings.id, type: 'numbered_list', content: 'Assigned responsibilities to team members', position: 10 },
    ]
  });

  // Child page: Code Snippets
  const code = await prisma.page.create({
    data: { title: 'Code Snippets', icon: '💻', parentId: root.id, position: 1 }
  });

  await prisma.block.createMany({
    data: [
      { pageId: code.id, type: 'heading1', content: 'Useful Code Snippets', position: 0 },
      { pageId: code.id, type: 'paragraph', content: 'A collection of useful code patterns and examples.', position: 1 },
      { pageId: code.id, type: 'heading2', content: 'TypeScript', position: 2 },
      { pageId: code.id, type: 'code', content: 'const greet = (name: string): string => {\n  return `Hello, ${name}!`;\n};\n\nconsole.log(greet("World"));', language: 'typescript', position: 3 },
      { pageId: code.id, type: 'heading2', content: 'Async/Await Pattern', position: 4 },
      { pageId: code.id, type: 'code', content: 'async function fetchData(url: string) {\n  try {\n    const response = await fetch(url);\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error("Error:", error);\n    throw error;\n  }\n}', language: 'typescript', position: 5 },
    ]
  });

  // Toggle demo page
  const toggleDemo = await prisma.page.create({
    data: { title: 'Block Types Demo', icon: '🎨', parentId: root.id, position: 2 }
  });

  const toggleBlock = await prisma.block.create({
    data: { pageId: toggleDemo.id, type: 'toggle', content: 'Click to expand this toggle block', position: 0 }
  });

  await prisma.block.createMany({
    data: [
      { pageId: toggleDemo.id, type: 'paragraph', content: 'This is nested content inside the toggle!', position: 0, parentBlockId: toggleBlock.id },
      { pageId: toggleDemo.id, type: 'bulleted_list', content: 'Nested bullet point 1', position: 1, parentBlockId: toggleBlock.id },
      { pageId: toggleDemo.id, type: 'bulleted_list', content: 'Nested bullet point 2', position: 2, parentBlockId: toggleBlock.id },
      { pageId: toggleDemo.id, type: 'heading2', content: 'All Block Types', position: 1 },
      { pageId: toggleDemo.id, type: 'paragraph', content: 'This is a paragraph block.', position: 2 },
      { pageId: toggleDemo.id, type: 'heading1', content: 'Heading 1', position: 3 },
      { pageId: toggleDemo.id, type: 'heading2', content: 'Heading 2', position: 4 },
      { pageId: toggleDemo.id, type: 'heading3', content: 'Heading 3', position: 5 },
      { pageId: toggleDemo.id, type: 'bulleted_list', content: 'Bulleted list item', position: 6 },
      { pageId: toggleDemo.id, type: 'numbered_list', content: 'Numbered list item', position: 7 },
      { pageId: toggleDemo.id, type: 'todo', content: 'Todo item (unchecked)', checked: false, position: 8 },
      { pageId: toggleDemo.id, type: 'todo', content: 'Todo item (checked)', checked: true, position: 9 },
      { pageId: toggleDemo.id, type: 'quote', content: 'This is a quote block with a left border.', position: 10 },
      { pageId: toggleDemo.id, type: 'divider', content: '', position: 11 },
      { pageId: toggleDemo.id, type: 'code', content: '// This is a code block\nconst x = 42;', language: 'javascript', position: 12 },
    ]
  });

  // Second top-level page
  const personal = await prisma.page.create({
    data: { title: 'Personal Notes', icon: '📖', position: 1 }
  });

  await prisma.block.createMany({
    data: [
      { pageId: personal.id, type: 'heading1', content: 'Personal Notes', position: 0 },
      { pageId: personal.id, type: 'paragraph', content: 'Use this space for personal notes, ideas, and thoughts.', position: 1 },
    ]
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
