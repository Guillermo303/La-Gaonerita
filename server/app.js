import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import mesaRoutes from './routes/mesas.js';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET', 'POST'] }
  });

  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
  app.use(express.json());
  app.set('io', io);

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.API_RATE_LIMIT_MAX) || 300, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos, intenta de nuevo más tarde' } });
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);

  io.on('connection', (socket) => {
    socket.on('join:kitchen', () => socket.join('kitchen'));
    socket.on('join:waiter', (userId) => socket.join(`waiter:${userId}`));
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/mesas', mesaRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  return { app, httpServer, io };
}
