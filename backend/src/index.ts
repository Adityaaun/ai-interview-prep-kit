import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import kitsRoutes from './routes/kits';
import { errorHandler } from './middlewares/errorMiddleware';

import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') }); // Explicitly resolve the backend .env

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Database Connection
connectDB();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/kits', kitsRoutes);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
