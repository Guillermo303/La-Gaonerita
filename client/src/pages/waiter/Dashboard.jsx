import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { orders as ordersApi, mesas as mesasApi } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { formatPrice, typeLabels } from '../../lib/utils';
import { requestNotifyPermission, notify } from '../../lib/notifications';
import { printTicket } from '../../lib/print';
import { notifyNewOrder, notifyOrderReady } from '../../lib/whatsapp';
import CobroModal from '../../components/CobroModal';
import MesaPanel from '../../components/MesaPanel';

const mesaStyles = {
  libre: { bg: 'bg-white', border: 'border-ink-200', text: 'text-ink-400', dot: '○', label: 'Libre' },
  ocupada: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', dot: '🟡', label: 'Ocupada' },
  'pendiente-pago': { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', dot: '💰', label: 'Cuenta' }
};

function ElapsedTime({ created }) {
  const [, setTick] = useState(0);
  const idRef = useRef(null);
  useEffect(() => {
    idRef.current = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(idRef.current);
  }, []);
  const diff = Date.now() - new Date(created + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span className="text-ink-300">recién</span>;
  if (mins < 60) return <span>{mins} min</span>;
  return <span>{Math.floor(mins / 60)}h {mins % 60}m</span>;
}

const statusConfig = {
  pendiente: { label: 'Pendiente', bg: 'bg-yellow-50 border-yellow-400', badge: 'bg-yellow-100 text-yellow-800', nextLabel: 'En Proceso', nextStatus: 'preparando', nextBg: 'bg-blue-500 hover:bg-blue-600' },
  preparando: { label: 'Preparando', bg: 'bg-blue-50 border-blue-400', badge: 'bg-blue-100 text-blue-800', nextLabel: 'Marcar Listo', nextStatus: 'listo', nextBg: 'bg-green-500 hover:bg-green-600' },
  listo: { label: 'Listo', bg: 'bg-green-50 border-green-400', badge: 'bg-green-100 text-green-800', nextLabel: 'Entregado', nextStatus: 'completado', nextBg: 'bg-brand-500 hover:bg-brand-600' },
  completado: { label: 'Entregado', bg: 'bg-purple-50 border-purple-400', badge: 'bg-purple-100 text-purple-800' }
};

export default function WaiterDashboard() {
  const [orders, setOrders] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [filter, setFilter] = useState('todas');
  const [expanded, setExpanded] = useState(null);
  const [cobrando, setCobrando] = useState(null);
  const [mesaPanel, setMesaPanel] = useState(null);
  const socket = useSocket();

  const loadData = () => { ordersApi.getAll().then(setOrders).catch(console.error); mesasApi.getAll().then(setMesas).catch(console.error); };
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!socket) return;
    requestNotifyPermission();
    socket.on('order:update', (order) => {
      if (order && order.status === 'listo') {
        notify(`Orden #${order.id} lista`, {
          body: `${order.customer_name} - $${order.total}`
        });
      }
      loadData();
    });
    return () => socket.off('order:update');
  }, [socket]);

  const updateStatus = (id, status) => ordersApi.updateStatus(id, status).catch(console.error);
  const handlePaid = () => { loadData(); };

  const filtered = filter === 'todas' ? orders : filter === 'domicilio' ? orders.filter(o => o.order_type === 'domicilio') : orders.filter(o => o.status === filter);

  const contar = (s) => orders.filter(o => o.status === s).length;
  const counts = `🟡${contar('pendiente')}  🔵${contar('preparando')}  🟢${contar('listo')}`;

  const mesaCounts = { libre: 0, ocupada: 0, 'pendiente-pago': 0 };
  mesas.forEach(m => { mesaCounts[m.state] = (mesaCounts[m.state] || 0) + 1; });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Mesa status grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-500">Mesas</h2>
          <div className="flex gap-3 text-xs text-ink-400">
            <span>○ {mesaCounts.libre}</span>
            <span>🟡 {mesaCounts.ocupada}</span>
            <span>💰 {mesaCounts['pendiente-pago']}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {mesas.map(m => {
            const s = mesaStyles[m.state] || mesaStyles.libre;
            return (
              <button key={m.id} onClick={() => setMesaPanel(m)}
                className={`${s.bg} ${s.border} border-2 rounded-xl p-3 text-center transition hover:scale-105 ${m.state === 'pendiente-pago' ? 'animate-pulse shadow-lg' : 'shadow-sm'} cursor-pointer w-full`}>
                <div className={`text-lg font-bold font-display uppercase ${s.text}`}>{m.name}</div>
                <div className={`text-xs font-semibold ${s.text}`}>{s.dot} {s.label}</div>
                {m.state !== 'libre' && m.lastCustomer && (
                  <div className="text-xs text-ink-400 mt-1 truncate">{m.lastCustomer}</div>
                )}
                {m.state === 'pendiente-pago' && (
                  <div className="text-xs text-green-600 font-bold mt-1">💰 Cobrar</div>
                )}
              </button>
            );
          })}
        </div>
        {mesas.some(m => m.state === 'pendiente-pago') && (
          <div className="mt-2 text-xs text-green-600 font-semibold text-center">💰 Hay mesas listas para cobrar</div>
        )}
      </div>

      {/* Delivery orders summary */}
      {orders.some(o => o.order_type === 'domicilio' && o.status !== 'completado' && o.status !== 'cancelado') && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🛵</span>
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-600">Domicilio</h2>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{orders.filter(o => o.order_type === 'domicilio' && o.status !== 'completado' && o.status !== 'cancelado').length} activos</span>
          </div>
          <div className="space-y-1.5">
            {orders.filter(o => o.order_type === 'domicilio' && o.status !== 'completado' && o.status !== 'cancelado').map(order => (
              <div key={order.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-black text-blue-800">#{order.id}</span>
                  <span className="text-sm font-semibold text-ink-700">{order.customer_name}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${order.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : order.status === 'preparando' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{order.status === 'pendiente' ? 'Pendiente' : order.status === 'preparando' ? 'Preparando' : 'Listo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {order.customer_address && <span className="text-xs text-ink-400 hidden sm:block truncate max-w-[120px]">{order.customer_address}</span>}
                  <span className="font-bold text-blue-700 text-sm">{formatPrice(order.total)}</span>
                  <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="text-xs text-ink-400">{expanded === order.id ? '▲' : '▼'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">Órdenes</h1>
          <p className="text-xs text-ink-400">{counts}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="text-sm border border-ink-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="todas">Todas</option>
            <option value="listo">Listas</option>
            <option value="preparando">Preparando</option>
            <option value="pendiente">Pendientes</option>
            <option value="domicilio">Domicilio</option>
          </select>
          <Link to="/waiter/new-order" className="bg-brand-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-brand-600 transition whitespace-nowrap">+ Nueva</Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-ink-400">
          <div className="text-4xl mb-3">🍃</div>
          <p className="font-semibold">No hay órdenes activas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const cfg = statusConfig[order.status] || statusConfig.pendiente;
            const isExpanded = expanded === order.id;
            return (
              <div key={order.id} className={`rounded-xl border-2 shadow-sm ${cfg.bg} transition`}>
                <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                  className="w-full flex items-center gap-3 p-3 text-left">
                  <span className="font-black text-base text-ink-900">#{order.id}</span>
                  <button onClick={(e) => { e.stopPropagation(); printTicket({ type: 'comanda', order, items: order.items || [] }); }} className="text-xs text-ink-300 hover:text-ink-600" title="Imprimir comanda">🖨️</button>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{typeLabels[order.order_type]}</span>
                  <span className="text-sm font-semibold text-ink-700 truncate">{order.customer_name}</span>
                  {order.mesa && <span className="text-xs text-ink-400 font-medium">{order.mesa}</span>}
                  <span className="font-bold text-ink-900 shrink-0 ml-auto text-sm">{formatPrice(order.total)}</span>
                  <span className="text-xs text-ink-400 shrink-0 w-14 text-right"><ElapsedTime created={order.created_at} /></span>
                  <span className="text-ink-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="bg-white/70 rounded-lg p-2 space-y-0.5 text-sm">
                      {order.items?.map(item => (
                        <div key={item.id}>
                          <div className="flex justify-between">
                            <span className="text-ink-800 font-medium">{item.quantity}x {item.name}</span>
                            <span className="text-ink-500">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                          {item.notes && <div className="text-xs text-yellow-600 ml-2">📝 {item.notes}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-500">
                      <span className="font-semibold text-ink-700">{order.customer_name}</span>
                      {order.customer_phone && <span>📞 {order.customer_phone}</span>}
                      {order.mesa && <span>📍 {order.mesa}</span>}
                      {order.order_type === 'domicilio' && order.customer_address && <span className="w-full">📍 {order.customer_address}</span>}
                    </div>
                    {order.notes && <div className="text-xs text-yellow-700 bg-yellow-50 p-1.5 rounded">📝 {order.notes}</div>}
                    <div className="flex items-center justify-between gap-2">
                      {order.customer_phone && (
                        <div className="flex gap-1">
                          {order.status === 'pendiente' && <a href={notifyNewOrder(order)} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded hover:bg-green-100 font-semibold">📱 Recibida</a>}
                          {order.status === 'listo' && <a href={notifyOrderReady(order)} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded hover:bg-green-100 font-semibold">📱 Lista</a>}
                        </div>
                      )}
                      {order.status === 'pendiente' && (
                        <button onClick={() => updateStatus(order.id, 'cancelado')} className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded hover:bg-red-100 font-semibold">Cancelar</button>
                      )}
                      {order.status === 'completado' && order.payment_status !== 'pagado' && (
                        <button onClick={() => setCobrando(order)} className="text-xs text-white bg-green-600 px-3 py-1.5 rounded-lg font-bold hover:bg-green-700">💰 Cobrar</button>
                      )}
                      {cfg.nextStatus && (
                        <button onClick={() => updateStatus(order.id, cfg.nextStatus)}
                          className={`text-white px-4 py-1.5 rounded-lg font-bold text-xs ${cfg.nextBg} transition ml-auto`}>{cfg.nextLabel}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {mesaPanel && (
        <MesaPanel mesa={mesaPanel} onClose={() => setMesaPanel(null)} onUpdate={loadData} />
      )}
      {cobrando && (
        <CobroModal order={cobrando} onClose={() => setCobrando(null)} onPaid={handlePaid} />
      )}
    </div>
  );
}
