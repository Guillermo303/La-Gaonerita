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
    <div className="bg-brand-500 text-white rounded-2xl px-6 py-4 flex items-center justify-center gap-3 mb-8 shadow-md">
      {queue.number ? (
        <>
          <span className="text-2xl">{queue.status === 'preparando' ? '👨‍🍳' : '⏭️'}</span>
          <span className="font-bold uppercase tracking-widest text-sm">
            {queue.status === 'preparando' ? 'Preparando ahora' : 'Siguiente turno'}
          </span>
          <span className="text-2xl font-black font-display">#{queue.number}</span>
        </>
      ) : (
        <span className="font-bold uppercase tracking-widest text-sm">🍃 Sin pedidos en fila</span>
      )}
    </div>
  );
}
