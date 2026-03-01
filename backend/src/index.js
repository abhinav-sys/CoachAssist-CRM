import 'dotenv/config';

const hasJwtSecret = process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '';
if (!hasJwtSecret) {
  console.error('Fatal: JWT_SECRET is missing or empty.');
  console.error('Local: set it in backend/.env');
  console.error('Render: Dashboard → your service → Environment → Add Variable: Key=JWT_SECRET, Value=<your-secret>');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { connectDB } from './utils/db.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import dashboardRoutes from './routes/dashboard.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Allow one or more origins (comma-separated), e.g. https://your-app.vercel.app
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check (no auth) — only "ok" when server and MongoDB are connected
app.get('/health', (_, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  if (!dbConnected) {
    return res.status(503).json({ ok: false, error: 'Database not connected', readyState: mongoose.connection.readyState });
  }
  res.json({ ok: true, database: 'connected' });
});

// Root: so visiting the API URL in a browser doesn't 404
app.get('/', (_, res) => res.json({ message: 'CoachAssist API', docs: '/health for health check' }));

// Auth routes (public)
app.use('/auth', authRoutes);

// Protected routes
app.use('/leads', authMiddleware, leadRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
