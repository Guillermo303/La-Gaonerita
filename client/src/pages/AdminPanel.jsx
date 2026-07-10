import { useState, useEffect } from 'react';
import { menu as menuApi, orders as ordersApi, mesas as mesasApi } from '../api';
import { useSocket } from '../context/SocketContext';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const tabs = ['Resumen', 'Menú', 'Mesas', 'Órdenes', 'Historial'];

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800',
  completado: 'bg-purple-100 text-purple-800',
  cancelado: 'bg-red-100 text-red-800'
};

function Resumen({ allOrders, menuData, mesas }) {
  const stats = [
    { label: 'Órdenes activas', value: allOrders.length, color: 'text-ink-900', bg: 'bg-white' },
    { label: 'Pendientes', value: allOrders.filter(o => o.status === 'pendiente').length, color: 'text-yellow-700', bg: 'bg-yellow-50' },
    { label: 'Preparando', value: allOrders.filter(o => o.status === 'preparando').length, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Listos', value: allOrders.filter(o => o.status === 'listo').length, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Pendientes pago', value: allOrders.filter(o => o.status === 'completado' && o.payment_status !== 'pagado').length, color: 'text-red-700', bg: 'bg-red-50' },
    { label: 'Mesas ocupadas', value: mesas.filter(m => m.state !== 'libre').length + '/' + mesas.length, color: 'text-ink-900', bg: 'bg-white' },
    { label: 'Categorías', value: menuData.length, color: 'text-ink-900', bg: 'bg-white' },
    { label: 'Items', value: menuData.reduce((s, c) => s + c.items.length, 0), color: 'text-ink-900', bg: 'bg-white' }
  ];
  const ventasHoy = allOrders.filter(o => o.payment_status === 'pagado').reduce((s, o) => s + o.total, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-ink-900">Panel de Control</h2>
        <div className="text-right">
          <div className="text-sm text-ink-400 font-medium uppercase tracking-wider">Ventas cobradas</div>
          <div className="text-2xl font-black text-brand-600">{formatPrice(ventasHoy)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-ink-100`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-ink-400 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuAdmin({ menuData, setMenuData }) {
  const [editing, setEditing] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [newItem, setNewItem] = useState({ catId: '', name: '', price: '', description: '' });

  const addCat = async () => {
    if (!newCat) return;
    await menuApi.createCategory({ name: newCat });
    setNewCat('');
    menuApi.getAllAdmin().then(setMenuData);
  };
  const delCat = async (id) => { await menuApi.deleteCategory(id); menuApi.getAllAdmin().then(setMenuData); };
  const toggleItem = async (item) => { await menuApi.updateItem(item.id, { available: item.available ? 0 : 1 }); menuApi.getAllAdmin().then(setMenuData); };
  const delItem = async (id) => { await menuApi.deleteItem(id); menuApi.getAllAdmin().then(setMenuData); };
  const addItem = async () => {
    if (!newItem.catId || !newItem.name || !newItem.price) return;
    await menuApi.createItem({ category_id: parseInt(newItem.catId), name: newItem.name, price: parseFloat(newItem.price), description: newItem.description || null });
    setNewItem({ catId: '', name: '', price: '', description: '' });
    menuApi.getAllAdmin().then(setMenuData);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nueva categoría..." className="border border-ink-200 rounded-lg p-2 text-sm flex-1" />
        <button onClick={addCat} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">Agregar</button>
      </div>
      <div className="space-y-6">
        {menuData.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-cream-50 px-4 py-3 border-b border-ink-100">
              <div className="flex items-center gap-3">
                {editing === `cat-${cat.id}` ? (
                  <input defaultValue={cat.name} onBlur={async (e) => { await menuApi.updateCategory(cat.id, { name: e.target.value }); setEditing(null); menuApi.getAllAdmin().then(setMenuData); }} autoFocus className="border border-brand-400 rounded px-2 py-1 text-sm font-bold" />
                ) : (
                  <h3 className="font-bold text-ink-900">{cat.name} <span className="text-ink-400 font-normal">({cat.items.length} items)</span></h3>
                )}
                <button onClick={() => setEditing(`cat-${cat.id}`)} className="text-xs text-brand-600 hover:underline">✏️</button>
              </div>
              <button onClick={() => delCat(cat.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
            </div>
            <div className="p-2">
              {cat.items.map(item => (
                <div key={item.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${!item.available ? 'opacity-50 bg-ink-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-ink-900">{item.name}</span>
                    <span className="text-brand-600 font-bold text-sm">{formatPrice(item.price)}</span>
                    {item.description && <span className="text-ink-400 text-xs hidden sm:inline">{item.description}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleItem(item)} className={`text-xs px-2 py-1 rounded font-semibold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.available ? 'Disponible' : 'Oculto'}</button>
                    <button onClick={() => delItem(item.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-ink-100 bg-cream-50/50">
              <div className="flex gap-2">
                <input value={editing === `item-cat-${cat.id}` ? newItem.name : ''} placeholder="Item..." onChange={e => setNewItem({ ...newItem, catId: cat.id, name: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm flex-1" />
                <input value={newItem.price} placeholder="$0" onChange={e => setNewItem({ ...newItem, catId: cat.id, price: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm w-20" />
                <input value={newItem.description} placeholder="Descripción..." onChange={e => setNewItem({ ...newItem, catId: cat.id, description: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm flex-1 hidden sm:block" />
                <button onClick={() => { setNewItem({ ...newItem, catId: cat.id }); addItem(); }} className="bg-brand-500 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-brand-600">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MesasAdmin({ mesas, setMesas }) {
  const [newMesa, setNewMesa] = useState('');
  const addMesa = async () => { if (!newMesa) return; await mesasApi.create({ name: newMesa }); setNewMesa(''); mesasApi.getAll().then(setMesas); };
  const delMesa = async (id) => { await mesasApi.delete(id); mesasApi.getAll().then(setMesas); };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input value={newMesa} onChange={e => setNewMesa(e.target.value)} placeholder="Nueva mesa..." className="border border-ink-200 rounded-lg p-2 text-sm flex-1" />
        <button onClick={addMesa} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">Agregar</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {mesas.map(m => {
          const stateStyles = { libre: 'border-ink-200 text-ink-400', ocupada: 'border-yellow-400 text-yellow-700', 'pendiente-pago': 'border-green-500 text-green-700' };
          const s = stateStyles[m.state] || stateStyles.libre;
          return (
            <div key={m.id} className={`bg-white border-2 rounded-xl p-4 text-center shadow-sm ${s}`}>
              <div className={`text-lg font-bold font-display uppercase ${s}`}>{m.name}</div>
              <div className="text-xs font-semibold mt-1">{m.state === 'libre' ? '○ Libre' : m.state === 'ocupada' ? '🟡 Ocupada' : '💰 Cuenta'}</div>
              {m.lastCustomer && <div className="text-xs text-ink-400 mt-1 truncate">{m.lastCustomer}</div>}
              <button onClick={() => delMesa(m.id)} className="text-xs text-red-400 hover:text-red-600 mt-2">Eliminar</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrdenesAdmin({ allOrders }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-2">
      {allOrders.length === 0 ? (
        <div className="text-center py-12 text-ink-400">No hay órdenes activas</div>
      ) : (
        allOrders.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-black text-ink-900">#{order.id}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] || ''}`}>{order.status}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.order_type}</span>
                {order.mesa && <span className="text-xs text-ink-400">{order.mesa}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-ink-900">{formatPrice(order.total)}</span>
                <button onClick={() => navigate(`/orders/${order.id}`)} className="text-xs text-brand-600 hover:underline">Ver</button>
              </div>
            </div>
            <div className="text-sm text-ink-500">{order.customer_name}{order.customer_phone && ` · 📞 ${order.customer_phone}`}</div>
          </div>
        ))
      )}
    </div>
  );
}

function HistorialAdmin() {
  const [history, setHistory] = useState([]);
  useEffect(() => { ordersApi.getHistory().then(setHistory).catch(console.error); }, []);
  return (
    <div className="space-y-2">
      {history.length === 0 ? (
        <div className="text-center py-12 text-ink-400">No hay historial</div>
      ) : (
        history.map(order => (
          <div key={order.id} className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="font-black text-ink-900">#{order.id}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] || ''}`}>{order.status}</span>
                <span className="text-xs text-ink-400">{new Date(order.created_at + 'Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.payment_status === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.payment_status}</span>
                <span className="font-bold text-ink-900">{formatPrice(order.total)}</span>
              </div>
            </div>
            <div className="text-sm text-ink-500">{order.customer_name} · {order.order_type === 'domicilio' ? '🛵 Domicilio' : '🏠 Local'}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState('Resumen');
  const [allOrders, setAllOrders] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [mesas, setMesas] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    ordersApi.getAllActive().then(setAllOrders).catch(console.error);
    menuApi.getAllAdmin().then(setMenuData).catch(console.error);
    mesasApi.getAll().then(setMesas).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:update', () => ordersApi.getAllActive().then(setAllOrders).catch(console.error));
    return () => socket.off('order:update');
  }, [socket]);

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-ink-900 text-cream-50 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black font-display">⚙️ Admin</h1>
        </div>
      </div>
      <div className="bg-white border-b border-ink-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition ${tab === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-ink-400 hover:text-ink-600'}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'Resumen' && <Resumen allOrders={allOrders} menuData={menuData} mesas={mesas} />}
        {tab === 'Menú' && <MenuAdmin menuData={menuData} setMenuData={setMenuData} />}
        {tab === 'Mesas' && <MesasAdmin mesas={mesas} setMesas={setMesas} />}
        {tab === 'Órdenes' && <OrdenesAdmin allOrders={allOrders} />}
        {tab === 'Historial' && <HistorialAdmin />}
      </div>
    </div>
  );
}
