import 'dotenv/config';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('Fatal: JWT_SECRET must be set in backend/.env (e.g. JWT_SECRET=your_secret_here)');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './utils/db.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import dashboardRoutes from './routes/dashboard.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check (no auth)
app.get('/health', (_, res) => res.json({ ok: true }));

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
