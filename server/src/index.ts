import express from 'express';
import cors from 'cors';
import pagesRouter from './routes/pages';
import blocksRouter from './routes/blocks';

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true; // allow all in dev
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/pages', pagesRouter);
app.use('/blocks', blocksRouter);

app.listen(PORT, () => {
  console.log(`NoteFlow server running on http://localhost:${PORT}`);
});

export default app;
