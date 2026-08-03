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
    <div className="shrink-0 flex flex-col items-center gap-1.5 w-20">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
          queue.number ? 'bg-brand-500' : 'bg-ink-200'
        }`}
      >
        {queue.number ? (
          <span key={queue.number} className="step-fade text-white text-3xl font-black font-display">
            #{queue.number}
          </span>
        ) : (
          <span className="text-2xl">🍃</span>
        )}
      </div>
      <span className="font-bold uppercase tracking-wider text-[10px] leading-tight text-ink-500 text-center">
        {queue.number
          ? (queue.status === 'preparando' ? '👨‍🍳 Preparando' : '⏭️ Sig. turno')
          : 'Sin fila'}
      </span>
    </div>
  );
}
