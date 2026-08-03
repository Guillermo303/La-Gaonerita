import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { orders as ordersApi } from '../api';

export default function QueueBanner() {
  const [queue, setQueue] = useState(null);

  useEffect(() => {
    const load = () => ordersApi.getQueueCurrent().then(setQueue).catch(() => {});
    load();
    const socket = io(import.meta.env.VITE_API_URL || '/', { transports: ['websocket', 'polling'] });
    socket.on('order:update', load);
    return () => socket.close();
  }, []);

  if (!queue) return null;

  return (
    <div className="flex flex-col items-center gap-2 mb-8">
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
          queue.number ? 'bg-brand-500' : 'bg-ink-200'
        }`}
      >
        {queue.number ? (
          <span key={queue.number} className="step-fade text-white text-4xl font-black font-display">
            #{queue.number}
          </span>
        ) : (
          <span className="text-3xl">🍃</span>
        )}
      </div>
      <span className="font-bold uppercase tracking-widest text-xs text-ink-500 text-center">
        {queue.number
          ? (queue.status === 'preparando' ? '👨‍🍳 Preparando ahora' : '⏭️ Siguiente turno')
          : 'Sin pedidos en fila'}
      </span>
    </div>
  );
}
