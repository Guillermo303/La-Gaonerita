import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import mesaRoutes from './routes/mesas.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join:kitchen', () => socket.join('kitchen'));
  socket.on('join:waiter', (userId) => socket.join(`waiter:${userId}`));
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/mesas', mesaRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  httpServer.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
});
