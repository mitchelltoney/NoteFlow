import express from 'express';
import cors from 'cors';
import pagesRouter from './routes/pages';
import blocksRouter from './routes/blocks';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/pages', pagesRouter);
app.use('/blocks', blocksRouter);

app.listen(PORT, () => {
  console.log(`NoteFlow server running on http://localhost:${PORT}`);
});

export default app;
