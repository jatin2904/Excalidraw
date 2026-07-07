import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
