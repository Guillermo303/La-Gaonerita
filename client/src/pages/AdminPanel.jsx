import { useState, useEffect } from 'react';
import { menu as menuApi, orders as ordersApi, mesas as mesasApi, promotions as promoApi } from '../api';
import { useSocket } from '../context/SocketContext';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { requestNotifyPermission, notify } from '../lib/notifications';
import { exportCSV, formatDate } from '../lib/exportCSV';
import ComunicacionesAdmin from './ComunicacionesAdmin';

const tabs = ['Resumen', 'Menú', 'Promociones', 'Comunicaciones', 'Mesas', 'Órdenes', 'Historial'];

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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black font-display text-lg">Historial</h3>
        <button onClick={() => exportCSV(history.map(o => ({
          ID: o.id, Cliente: o.customer_name, Telefono: o.customer_phone, Tipo: o.order_type,
          Mesa: o.mesa || '', Total: '$' + o.total, Estado: o.status, Pago: o.payment_status,
          Fecha: formatDate(o.created_at)
        })), 'historial_ordenes')} className="border border-ink-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-ink-50 transition">⬇ Exportar</button>
      </div>
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
    </div>
  );
}

function PromocionesAdmin() {
  const [promos, setPromos] = useState([]);
  const [menuData, setMenuData] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase: 0, applicable_items: [], start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { promoApi.getAll().then(setPromos).catch(console.error); menuApi.getAllAdmin().then(setMenuData).catch(console.error); }, []);

  const load = () => promoApi.getAll().then(setPromos).catch(console.error);

  const openNew = () => {
    const now = new Date(); const later = new Date(now.getTime() + 7 * 86400000);
    setForm({ name: '', description: '', discount_type: 'percentage', discount_value: '', min_purchase: 0, applicable_items: [], start_date: now.toISOString().slice(0, 16), end_date: later.toISOString().slice(0, 16) });
    setEditing('new');
  };

  const openEdit = (p) => {
    setForm({ name: p.name, description: p.description || '', discount_type: p.discount_type, discount_value: p.discount_value, min_purchase: p.min_purchase, applicable_items: p.applicable_items ? JSON.parse(p.applicable_items) : [], start_date: p.start_date.slice(0, 16), end_date: p.end_date.slice(0, 16) });
    setEditing(p.id);
  };

  const save = async () => {
    if (!form.name || !form.discount_value || !form.start_date || !form.end_date) return;
    setSaving(true);
    try {
      if (editing === 'new') await promoApi.create(form);
      else await promoApi.update(editing, form);
      setEditing(null); load();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const toggleActive = async (p) => { await promoApi.update(p.id, { active: p.active ? 0 : 1 }); load(); };
  const del = async (id) => { if (confirm('Eliminar promoción?')) { await promoApi.delete(id); load(); } };

  const allItems = menuData.flatMap(c => c.items || []);

  const formContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)}>
      <div onClick={e => e.stopPropagation()} className="bg-cream-50 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-black font-display text-lg">{editing === 'new' ? 'Nueva promoción' : 'Editar promoción'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="text-xs font-bold text-ink-500">Nombre</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border border-ink-200 rounded-lg text-sm" /></div>
          <div className="col-span-2"><label className="text-xs font-bold text-ink-500">Descripción</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full p-2 border border-ink-200 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-ink-500">Tipo</label><select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="w-full p-2 border border-ink-200 rounded-lg text-sm bg-white"><option value="percentage">% Porcentaje</option><option value="fixed">$ Fijo</option></select></div>
          <div><label className="text-xs font-bold text-ink-500">{form.discount_type === 'percentage' ? 'Porcentaje' : 'Monto'}</label><input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} className="w-full p-2 border border-ink-200 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-ink-500">Compra mínima ($)</label><input type="number" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} className="w-full p-2 border border-ink-200 rounded-lg text-sm" /></div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-ink-500">Productos aplicables</label>
            <div className="flex flex-wrap gap-1 mt-1">{allItems.map(item => (
              <button key={item.id} onClick={() => setForm({ ...form, applicable_items: form.applicable_items.includes(item.id) ? form.applicable_items.filter(i => i !== item.id) : [...form.applicable_items, item.id] })}
                className={`text-xs px-2 py-1 rounded-lg border font-medium ${form.applicable_items.includes(item.id) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-ink-600 border-ink-200'}`}>{item.name}</button>
            ))}</div>
            <button onClick={() => setForm({ ...form, applicable_items: [] })} className="text-xs text-ink-400 mt-1 hover:text-ink-600">Limpiar selección (aplica a toda la orden)</button>
          </div>
          <div><label className="text-xs font-bold text-ink-500">Inicio</label><input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full p-2 border border-ink-200 rounded-lg text-sm" /></div>
          <div><label className="text-xs font-bold text-ink-500">Fin</label><input type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full p-2 border border-ink-200 rounded-lg text-sm" /></div>
        </div>
        <div className="flex gap-2"><button onClick={save} disabled={saving} className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-brand-700">{saving ? 'Guardando…' : 'Guardar'}</button><button onClick={() => setEditing(null)} className="px-4 py-2.5 border border-ink-200 rounded-xl text-sm font-bold text-ink-600">Cancelar</button></div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="font-black font-display text-lg">Promociones</h2><button onClick={openNew} className="bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-600">+ Nueva</button></div>
      {promos.length === 0 ? <p className="text-ink-400 text-sm">Sin promociones</p> : (
        <div className="space-y-2">{promos.map(p => (
          <div key={p.id} className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${new Date(p.end_date) < new Date() ? 'border-l-ink-300 opacity-50' : p.active ? 'border-l-green-500' : 'border-l-ink-300'}`}>
            <div className="flex justify-between items-start">
              <div><div className="font-bold text-ink-900">{p.name}</div><div className="text-xs text-ink-400 mt-0.5">{p.description || 'Sin descripción'}</div></div>
              <div className="flex gap-2 items-center">
                <span className={`text-lg font-black ${p.discount_type === 'percentage' ? 'text-green-600' : 'text-brand-600'}`}>{p.discount_type === 'percentage' ? `${p.discount_value}%` : `$${p.discount_value}`}</span>
                <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-lg font-bold ${p.active ? 'bg-green-100 text-green-700' : 'bg-ink-100 text-ink-500'}`}>{p.active ? 'Activa' : 'Inactiva'}</button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-ink-400">
              <span>{new Date(p.start_date).toLocaleDateString()} → {new Date(p.end_date).toLocaleDateString()} {p.min_purchase > 0 && `· Mín $${p.min_purchase}`}</span>
              <div className="flex gap-2"><button onClick={() => openEdit(p)} className="text-brand-600 hover:text-brand-800">Editar</button><button onClick={() => del(p.id)} className="text-red-500 hover:text-red-700">Eliminar</button></div>
            </div>
          </div>
        ))}</div>
      )}
      {editing && formContent}
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
    requestNotifyPermission();
    socket.on('order:update', (order) => {
      if (order && order.status === 'pagado') {
        notify(`Pago recibido #${order.id}`, {
          body: `$${order.total} - ${order.customer_name}`
        });
      }
      ordersApi.getAllActive().then(setAllOrders).catch(console.error);
    });
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
        {tab === 'Promociones' && <PromocionesAdmin />}
        {tab === 'Comunicaciones' && <ComunicacionesAdmin />}
        {tab === 'Mesas' && <MesasAdmin mesas={mesas} setMesas={setMesas} />}
        {tab === 'Órdenes' && <OrdenesAdmin allOrders={allOrders} />}
        {tab === 'Historial' && <HistorialAdmin />}
      </div>
    </div>
  );
}
