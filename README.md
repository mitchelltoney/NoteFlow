# NoteFlow

A Notion-style block editor with nested pages, drag-and-drop reordering, and a clean Tailwind UI. Built as a full-stack TypeScript monorepo.

---

## Architecture

### Monorepo layout

```
NoteFlow/
├── client/          # React SPA (Vite)
├── server/          # Express REST API
├── shared/          # Zod schemas + TypeScript types (shared by both)
├── docker-compose.yml  # Local Postgres
└── .env.example
```

### Frontend — `client/`

| Concern | Library |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (dark mode via `class` strategy) |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Local state | Zustand (dark mode, sidebar open/closed) |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| HTTP | Axios (base URL from `VITE_API_URL`) |

Key design decisions:
- **contentEditable blocks** use a custom `ContentEditable` wrapper (`BlockEditor.tsx`) that tracks `lastServerValue` to prevent React re-renders from overwriting in-progress edits. Content saves are fire-and-forget — no query invalidation — to avoid cursor resets.
- **Debounced auto-save** at 400ms via `saveContentMutation` (content only) vs `updateBlockMutation` (structural changes like type, checked, position — these do invalidate).
- **Slash command menu** (`/`) opens a popup block-type picker; arrow keys navigate, Enter selects, Escape closes.
- The page title uses the same `lastServerValue` ref pattern to prevent blur-triggered content loss.

### Backend — `server/`

| Concern | Library |
|---|---|
| Runtime | Node.js + TypeScript (compiled with `tsc`, run with `node`) |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL (local via Docker, production via Neon) |
| Validation | Zod (schemas from `@noteflow/shared`) |
| Dev server | `tsx watch` |

**API surface:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check — wakes Render free tier |
| `GET` | `/pages` | Full page tree (nested, recursive) |
| `GET` | `/pages/:id` | Page metadata + all blocks ordered by position |
| `POST` | `/pages` | Create a page (optional `parentId`) |
| `PATCH` | `/pages/:id` | Update title, icon, parentId, or position |
| `DELETE` | `/pages/:id` | Cascade-delete page, children, and blocks |
| `POST` | `/pages/:id/blocks` | Add a block at a given position |
| `PATCH` | `/blocks/:id` | Update content, type, checked, position, or parentBlockId |
| `DELETE` | `/blocks/:id` | Delete a block and any nested children |
| `POST` | `/blocks/reorder` | Bulk-update positions after drag-and-drop |

CORS origins are read from `CORS_ORIGIN` (comma-separated env var), falling back to `*` in development.

### Shared — `shared/`

Zod schemas for every request body, plus inferred TypeScript types used by both client and server. Consumed as an npm workspace package (`@noteflow/shared`).

### Data model

```
Page
  id          cuid (PK)
  title       Text
  icon        String?          (nullable, was emoji — removed from UI)
  parentId    String?          (self-referential FK → Page, cascade delete)
  position    Int              (sibling ordering)
  createdAt / updatedAt

Block
  id            cuid (PK)
  pageId        String         (FK → Page, cascade delete)
  type          String         (paragraph | heading1 | heading2 | heading3 |
                                bulleted_list | numbered_list | todo | toggle |
                                code | divider | quote)
  content       Text
  checked       Boolean        (todo blocks)
  language      String?        (code blocks)
  position      Int
  parentBlockId String?        (FK → Block, for nesting under toggle blocks)
  createdAt / updatedAt
```

---

## Local Development

### Prerequisites
- Node.js 18+
- Docker (for local Postgres via `docker-compose.yml`)

### First-time setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start local Postgres
npm run db:up

# 3. Configure environment
cp .env.example server/.env
# Defaults match docker-compose — no edits needed for local dev

# 4. Run migrations and seed demo data
npm run db:migrate
npm run db:seed

# 5. Start client + server concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client (5173) + server (3001) concurrently |
| `npm run db:up` | Start Postgres container (`docker compose up -d`) |
| `npm run db:down` | Stop Postgres container |
| `npm run db:migrate` | Apply pending Prisma migrations |
| `npm run db:seed` | Seed demo data (idempotent — safe to re-run) |
| `npm run db:reset` | Wipe and re-seed (`--force`) |

---

## Deployment (all free tier)

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (no credit card required)
2. Create a project, then from the dashboard copy:
   - **Pooled connection string** → `DATABASE_URL`
   - **Direct/unpooled connection string** → `DIRECT_URL`
3. Both strings should include `?sslmode=require`

Neon requires two URLs because Prisma uses the direct connection for migrations and the pooled one for runtime queries.

### 2. Backend — Render

1. Connect this repo at [render.com](https://render.com) → New Web Service
2. Settings:
   - **Root directory:** `server`
   - **Build command:** `npm install && npx prisma migrate deploy && npm run build`
   - **Start command:** `npm start`
3. Environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Vercel frontend URL (set after frontend deploys) |

> Render's free tier sleeps after ~15 min of inactivity. The first request after sleep takes ~30s. The `/health` endpoint exists specifically for uptime pingers to keep it warm.

### 3. Frontend — Vercel

1. Import this repo at [vercel.com](https://vercel.com)
2. Settings:
   - **Root directory:** `client`
   - **Framework preset:** Vite
3. Environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Render backend URL (e.g. `https://noteflow.onrender.com`) |

4. After the frontend deploys, copy its URL into Render's `CORS_ORIGIN` env var.
