import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import mesaRoutes from './routes/mesas.js';
import employeeRoutes from './routes/employees.js';
import socioRoutes from './routes/socios.js';
import reservationRoutes from './routes/reservations.js';
import reportRoutes from './routes/reports.js';
import expenseRoutes from './routes/expenses.js';
import supplyRoutes from './routes/supplies.js';
import assetRoutes from './routes/assets.js';
import userRoutes from './routes/users.js';
import customizationRoutes from './routes/customizations.js';

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

export function createApp() {
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : DEFAULT_ORIGINS;

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
  });

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());
  app.set('io', io);

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.API_RATE_LIMIT_MAX) || 300, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos, intenta de nuevo más tarde' } });
  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  io.on('connection', (socket) => {
    socket.on('join:kitchen', () => socket.join('kitchen'));
    socket.on('join:waiter', (userId) => socket.join(`waiter:${userId}`));
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/mesas', mesaRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/socios', socioRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/supplies', supplyRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/customizations', customizationRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Red de seguridad: captura cualquier error no manejado explícitamente por
  // una ruta (ej. una falla de conexión a la base de datos) y responde con un
  // error en vez de dejar la petición colgada sin respuesta.
  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return { app, httpServer, io };
}
