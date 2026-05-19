# NoteFlow

A simplified Notion clone — nested pages, block-based editor, drag-and-drop reordering.

**Stack:** React + Vite + TypeScript · Tailwind CSS · TanStack Query · Express · Prisma · PostgreSQL

## Local Development

### Prerequisites
- Node.js 18+
- Docker (for local Postgres)

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres (Docker)
npm run db:up

# 3. Copy env and configure
cp .env.example server/.env
# Edit server/.env if needed (defaults work with docker-compose)

# 4. Run migrations and seed
npm run db:migrate
npm run db:seed

# 5. Start dev servers
npm run dev
```

Open http://localhost:5173

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client (5173) + server (3001) concurrently |
| `npm run db:up` | Start local Postgres container |
| `npm run db:down` | Stop Postgres container |
| `npm run db:seed` | Seed with demo data (idempotent) |
| `npm run db:reset` | Wipe and re-seed |
| `npm run db:migrate` | Run pending migrations |

---

## Deployment (all free tier)

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (no credit card)
2. Create a new project
3. From the dashboard, copy:
   - **Pooled connection string** → `DATABASE_URL`
   - **Direct/unpooled connection string** → `DIRECT_URL`
4. Both strings should end with `?sslmode=require`

### 2. Backend — Render

1. Connect your GitHub repo at [render.com](https://render.com)
2. New → Web Service
3. Settings:
   - **Root directory:** `server`
   - **Build command:** `npm install && npx prisma migrate deploy && npm run build`
   - **Start command:** `npm start`
4. Environment variables:
   - `DATABASE_URL` — Neon pooled URL
   - `DIRECT_URL` — Neon direct URL
   - `NODE_ENV` — `production`
   - `CORS_ORIGIN` — your Vercel frontend URL (add after deploying frontend)

> **Note:** Render free tier sleeps after ~15 min of inactivity. The first request after sleep takes ~30s. Hit `/health` to wake the service.

### 3. Frontend — Vercel

1. Import your GitHub repo at [vercel.com](https://vercel.com)
2. Settings:
   - **Root directory:** `client`
   - **Framework:** Vite
3. Environment variables:
   - `VITE_API_URL` — your Render backend URL (e.g. `https://noteflow.onrender.com`)
4. After deploy, copy the Vercel URL back into Render's `CORS_ORIGIN`

---

## Project Structure

```
NoteFlow/
├── client/          # React + Vite frontend
├── server/          # Express + Prisma backend
├── shared/          # Zod schemas + shared types
├── docker-compose.yml
└── .env.example
```
