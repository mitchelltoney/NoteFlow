# NoteFlow

A simplified Notion clone with nested pages and a block-based editor.

## Setup

### Prerequisites
- Node.js 18+
- npm 8+

### Install
```bash
npm install
```

### Migrate & Seed Database
```bash
npm run db:seed
```

### Run
```bash
npm run dev
```

This starts:
- Backend API: http://localhost:3001
- Frontend: http://localhost:5173

## Features

- Nested page tree in collapsible sidebar
- Block-based editor with 11 block types
- Slash command (/) to insert blocks
- Drag-and-drop block reordering
- Todo checkboxes with Cmd+Enter toggle
- Toggle blocks with nested content
- Code blocks with language selection
- Dark mode
- Auto-save with debouncing
