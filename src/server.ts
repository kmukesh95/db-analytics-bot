import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { askAnalyticsBot } from './ai/agent.js';

const app = express();
app.use(express.json());

app.post('/api/bot/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Field "query" is required as a string.' });
    }

    const reply = await askAnalyticsBot(query);
    return res.json({ reply });
  } catch (error: any) {
    console.error('Bot Query Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Analytics Bot server running on http://localhost:${PORT}`);
});