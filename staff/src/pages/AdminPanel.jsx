import { useState, useEffect } from 'react';
import { menu as menuApi, orders as ordersApi, mesas as mesasApi, employees as employeesApi, reservations as reservationsApi, reports as reportsApi, socios as sociosApi, expenses as expensesApi, supplies as suppliesApi, assets as assetsApi, users as usersApi, customizations as customizationsApi } from '../api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../lib/utils';
import { printSalesReport, downloadSalesCSV, printFinanceOverview, downloadFinanceCSV } from '../lib/reportPrint';
import { useNavigate } from 'react-router-dom';

const tabs = ['Resumen', 'Finanzas', 'Menú', 'Personalización', 'Mesas', 'Reservaciones', 'Reportes', 'Gastos', 'Insumos', 'Activos', 'Órdenes', 'Historial', 'Empleados', 'Socios'];

const ASSET_CATEGORIES = [
  { value: 'cocina', label: 'Cocina' },
  { value: 'mobiliario', label: 'Mobiliario' },
  { value: 'electronica', label: 'Electrónica' },
  { value: 'punto_de_venta', label: 'Punto de Venta' },
  { value: 'otro', label: 'Otro' }
];
const ASSET_CATEGORY_LABELS = Object.fromEntries(ASSET_CATEGORIES.map(c => [c.value, c.label]));

const ASSET_CONDITIONS = [
  { value: 'nuevo', label: 'Nuevo', color: 'bg-green-100 text-green-700' },
  { value: 'bueno', label: 'Bueno', color: 'bg-cream-100 text-ink-600' },
  { value: 'regular', label: 'Regular', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'malo', label: 'Malo', color: 'bg-orange-100 text-orange-700' },
  { value: 'fuera_de_servicio', label: 'Fuera de Servicio', color: 'bg-red-100 text-red-700' }
];
const ASSET_CONDITION_MAP = Object.fromEntries(ASSET_CONDITIONS.map(c => [c.value, c]));

const EXPENSE_CATEGORIES = [
  { value: 'renta', label: 'Renta' },
  { value: 'servicios', label: 'Servicios (luz, agua, gas, internet)' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otro', label: 'Otro' }
];
const EXPENSE_CATEGORY_LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.value, c.label]));

const roleLabels = { admin: 'Administrador', cocina: 'Cocina', mesero: 'Mesero' };
const ROLES = [{ value: 'mesero', label: 'Mesero' }, { value: 'cocina', label: 'Cocina' }, { value: 'admin', label: 'Administrador' }];
const PERIODOS = [{ value: 'semanal', label: 'Semanal' }, { value: 'quincenal', label: 'Quincenal' }, { value: 'mensual', label: 'Mensual' }];
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const PRESTACIONES_OPCIONES = ['IMSS', 'Aguinaldo', 'Vacaciones', 'Prima Vacacional', 'Reparto de Utilidades', 'Vales de Despensa', 'Seguro de Vida'];

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

function MenuItemRow({ item, onToggle, onDelete, onSaveStock, onSaveItem }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: item.name, price: item.price, description: item.description || '', readyToServe: !!item.ready_to_serve });

  const startEdit = () => {
    setForm({ name: item.name, price: item.price, description: item.description || '', readyToServe: !!item.ready_to_serve });
    setEditing(true);
  };

  const save = async () => {
    await onSaveItem({ name: form.name, price: parseFloat(form.price) || 0, description: form.description || null, ready_to_serve: form.readyToServe });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg gap-2 flex-wrap bg-cream-50/50">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border border-brand-400 rounded px-2 py-1 text-sm flex-1 min-w-[8rem]" autoFocus />
          <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="border border-brand-400 rounded px-2 py-1 text-sm w-20" />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción..." className="border border-brand-400 rounded px-2 py-1 text-sm flex-1 min-w-[8rem] hidden sm:block" />
          <label className="flex items-center gap-1 text-xs text-ink-500 whitespace-nowrap" title="No requiere preparación (ej. bebidas embotelladas)">
            <input type="checkbox" checked={form.readyToServe} onChange={e => setForm({ ...form, readyToServe: e.target.checked })} />
            ⚡
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} className="text-xs bg-brand-500 text-white px-2 py-1 rounded font-bold hover:bg-brand-600">✓</button>
          <button onClick={() => setEditing(false)} className="text-xs text-ink-400 px-1">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg gap-2 flex-wrap ${!item.available ? 'opacity-50 bg-ink-50' : ''}`}>
      <div className="flex items-center gap-3">
        {item.ready_to_serve ? <span title="Venta rápida: no requiere preparación">⚡</span> : null}
        <span className="font-medium text-sm text-ink-900">{item.name}</span>
        <span className="text-brand-600 font-bold text-sm">{formatPrice(item.price)}</span>
        {item.description && <span className="text-ink-400 text-xs hidden sm:inline">{item.description}</span>}
      </div>
      <div className="flex items-center gap-2">
        <StockBadge item={item} onSave={onSaveStock} />
        <button onClick={startEdit} className="text-xs text-brand-600 hover:underline">✏️</button>
        <button onClick={onToggle} className={`text-xs px-2 py-1 rounded font-semibold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.available ? 'Disponible' : 'Oculto'}</button>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">✕</button>
      </div>
    </div>
  );
}

function StockBadge({ item, onSave }) {
  const [open, setOpen] = useState(false);
  const [stock, setStock] = useState(item.stock);
  const [maxStock, setMaxStock] = useState(item.max_stock);

  const ratio = item.max_stock > 0 ? item.stock / item.max_stock : 1;
  const color = item.stock === 0 ? 'bg-red-100 text-red-700' : ratio <= 0.25 ? 'bg-yellow-100 text-yellow-700' : 'bg-cream-100 text-ink-600';

  if (open) {
    return (
      <div className="flex items-center gap-1.5 bg-cream-50 border border-ink-200 rounded-lg px-2 py-1">
        <span className="text-[10px] text-ink-400 font-semibold">Stock</span>
        <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} className="w-14 text-xs border border-ink-200 rounded px-1 py-0.5" />
        <span className="text-[10px] text-ink-400 font-semibold">Cap.</span>
        <input type="number" min="0" value={maxStock} onChange={e => setMaxStock(e.target.value)} className="w-14 text-xs border border-ink-200 rounded px-1 py-0.5" />
        <button onClick={async () => { await onSave(Number(stock), Number(maxStock)); setOpen(false); }} className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded font-bold hover:bg-brand-600">✓</button>
        <button onClick={() => setOpen(false)} className="text-xs text-ink-400 px-1">✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => { setStock(item.stock); setMaxStock(item.max_stock); setOpen(true); }} className={`text-xs px-2 py-1 rounded font-semibold ${color}`} title="Editar inventario">
      📦 {item.stock === 0 ? 'Agotado' : `${item.stock}/${item.max_stock}`}
    </button>
  );
}

function MenuAdmin({ menuData, setMenuData }) {
  const [editing, setEditing] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [newItem, setNewItem] = useState({ catId: '', name: '', price: '', description: '', maxStock: '', readyToServe: false });
  const [error, setError] = useState('');

  const reload = () => menuApi.getAllAdmin().then(setMenuData).catch(e => setError(e.message));

  const addCat = async () => {
    if (!newCat) return;
    setError('');
    try {
      await menuApi.createCategory({ name: newCat });
      setNewCat('');
      reload();
    } catch (e) {
      setError(e.message);
    }
  };
  const delCat = async (id) => {
    setError('');
    try { await menuApi.deleteCategory(id); reload(); } catch (e) { setError(e.message); }
  };
  const toggleItem = async (item) => {
    setError('');
    try { await menuApi.updateItem(item.id, { available: item.available ? 0 : 1 }); reload(); } catch (e) { setError(e.message); }
  };
  const delItem = async (id) => {
    setError('');
    try { await menuApi.deleteItem(id); reload(); } catch (e) { setError(e.message); }
  };
  const saveItem = async (id, data) => {
    setError('');
    try { await menuApi.updateItem(id, data); reload(); } catch (e) { setError(e.message); }
  };
  const saveStock = async (item, stock, maxStock) => {
    setError('');
    try {
      if (maxStock !== item.max_stock) await menuApi.updateItem(item.id, { max_stock: maxStock });
      if (stock !== item.stock) await menuApi.updateStock(item.id, stock);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };
  const addItem = async () => {
    if (!newItem.catId || !newItem.name || !newItem.price) return;
    setError('');
    try {
      await menuApi.createItem({ category_id: parseInt(newItem.catId), name: newItem.name, price: parseFloat(newItem.price), description: newItem.description || null, max_stock: newItem.maxStock ? parseInt(newItem.maxStock) : 20, ready_to_serve: newItem.readyToServe });
      setNewItem({ catId: '', name: '', price: '', description: '', maxStock: '', readyToServe: false });
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
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
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item)}
                  onDelete={() => delItem(item.id)}
                  onSaveStock={(stock, maxStock) => saveStock(item, stock, maxStock)}
                  onSaveItem={(data) => saveItem(item.id, data)}
                />
              ))}
            </div>
            <div className="px-4 py-3 border-t border-ink-100 bg-cream-50/50">
              <div className="flex flex-wrap gap-2">
                <input value={newItem.catId === cat.id ? newItem.name : ''} placeholder="Item..." onChange={e => setNewItem({ ...newItem, catId: cat.id, name: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm flex-1 min-w-[7rem]" />
                <input value={newItem.catId === cat.id ? newItem.price : ''} placeholder="$0" onChange={e => setNewItem({ ...newItem, catId: cat.id, price: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm w-16" />
                <input value={newItem.catId === cat.id ? newItem.maxStock : ''} placeholder="Cap. 20" onChange={e => setNewItem({ ...newItem, catId: cat.id, maxStock: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm w-20" title="Capacidad diaria" />
                <input value={newItem.catId === cat.id ? newItem.description : ''} placeholder="Descripción..." onChange={e => setNewItem({ ...newItem, catId: cat.id, description: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm flex-1 min-w-[7rem] hidden sm:block" />
                <label className="flex items-center gap-1 text-xs text-ink-500 whitespace-nowrap" title="No requiere preparación (ej. bebidas embotelladas)">
                  <input type="checkbox" checked={newItem.catId === cat.id ? newItem.readyToServe : false} onChange={e => setNewItem({ ...newItem, catId: cat.id, readyToServe: e.target.checked })} />
                  ⚡
                </label>
                <button onClick={() => { setNewItem({ ...newItem, catId: cat.id }); addItem(); }} className="bg-brand-500 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-brand-600">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonalizacionAdmin() {
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({ name: '', selection_type: 'single' });
  const [newOption, setNewOption] = useState({ groupId: '', name: '' });
  const [editingGroup, setEditingGroup] = useState(null);
  const [error, setError] = useState('');

  const reload = () => customizationsApi.getAll().then(setGroups).catch(e => setError(e.message));
  useEffect(() => { reload(); }, []);

  const addGroup = async () => {
    if (!newGroup.name) return;
    setError('');
    try {
      await customizationsApi.createGroup(newGroup);
      setNewGroup({ name: '', selection_type: 'single' });
      reload();
    } catch (e) { setError(e.message); }
  };
  const saveGroup = async (id, data) => {
    setError('');
    try { await customizationsApi.updateGroup(id, data); setEditingGroup(null); reload(); } catch (e) { setError(e.message); }
  };
  const delGroup = async (id) => {
    setError('');
    try { await customizationsApi.deleteGroup(id); reload(); } catch (e) { setError(e.message); }
  };
  const addOption = async () => {
    if (!newOption.groupId || !newOption.name) return;
    setError('');
    try {
      await customizationsApi.createOption(newOption.groupId, { name: newOption.name });
      setNewOption({ groupId: '', name: '' });
      reload();
    } catch (e) { setError(e.message); }
  };
  const delOption = async (id) => {
    setError('');
    try { await customizationsApi.deleteOption(id); reload(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <p className="text-sm text-ink-400 mb-4">Opciones gratuitas que el cliente elige en el menú (ej. tipo de tortilla, acompañamientos) — aplican a todo el menú, no a un platillo en específico.</p>
      <div className="flex items-center gap-2 mb-6">
        <input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Nuevo grupo (ej. Tortilla)..." className="border border-ink-200 rounded-lg p-2 text-sm flex-1" />
        <select value={newGroup.selection_type} onChange={e => setNewGroup({ ...newGroup, selection_type: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          <option value="single">Selección única</option>
          <option value="multiple">Selección múltiple</option>
        </select>
        <button onClick={addGroup} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">Agregar</button>
      </div>
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-cream-50 px-4 py-3 border-b border-ink-100">
              <div className="flex items-center gap-3">
                {editingGroup === group.id ? (
                  <>
                    <input defaultValue={group.name} onBlur={e => saveGroup(group.id, { name: e.target.value })} autoFocus className="border border-brand-400 rounded px-2 py-1 text-sm font-bold" />
                    <select defaultValue={group.selection_type} onChange={e => saveGroup(group.id, { selection_type: e.target.value })} className="border border-brand-400 rounded px-2 py-1 text-sm bg-white">
                      <option value="single">Única</option>
                      <option value="multiple">Múltiple</option>
                    </select>
                  </>
                ) : (
                  <h3 className="font-bold text-ink-900">{group.name} <span className="text-ink-400 font-normal text-sm">({group.selection_type === 'single' ? 'selección única' : 'selección múltiple'})</span></h3>
                )}
                <button onClick={() => setEditingGroup(editingGroup === group.id ? null : group.id)} className="text-xs text-brand-600 hover:underline">✏️</button>
              </div>
              <button onClick={() => delGroup(group.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
            </div>
            <div className="p-2">
              {group.options.map(option => (
                <div key={option.id} className="flex items-center justify-between px-3 py-2 rounded-lg">
                  <span className="font-medium text-sm text-ink-900">{option.name}</span>
                  <button onClick={() => delOption(option.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-ink-100 bg-cream-50/50">
              <div className="flex gap-2">
                <input value={newOption.groupId === group.id ? newOption.name : ''} placeholder="Nueva opción..." onChange={e => setNewOption({ groupId: group.id, name: e.target.value })} className="border border-ink-200 rounded p-1.5 text-sm flex-1" />
                <button onClick={() => { setNewOption({ ...newOption, groupId: group.id }); addOption(); }} className="bg-brand-500 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-brand-600">+</button>
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
          const stateStyles = { libre: 'border-ink-200 text-ink-400', ocupada: 'border-yellow-400 text-yellow-700', 'pendiente-pago': 'border-green-500 text-green-700', reservada: 'border-blue-400 text-blue-700' };
          const stateLabels = { libre: '○ Libre', ocupada: '🟡 Ocupada', 'pendiente-pago': '💰 Cuenta', reservada: '📅 Reservada' };
          const s = stateStyles[m.state] || stateStyles.libre;
          return (
            <div key={m.id} className={`bg-white border-2 rounded-xl p-4 text-center shadow-sm ${s}`}>
              <div className={`text-lg font-bold font-display uppercase ${s}`}>{m.name}</div>
              <div className="text-xs text-ink-400 mt-0.5">Capacidad: {m.capacity}</div>
              <div className="text-xs font-semibold mt-1">{stateLabels[m.state] || stateLabels.libre}</div>
              {m.reservation && (
                <div className="text-xs text-blue-600 mt-1 truncate">{m.reservation.time} · {m.reservation.customer_name}</div>
              )}
              {m.lastCustomer && <div className="text-xs text-ink-400 mt-1 truncate">{m.lastCustomer}</div>}
              <button onClick={() => delMesa(m.id)} className="text-xs text-red-400 hover:text-red-600 mt-2">Eliminar</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const reservationStatusColors = {
  confirmada: 'bg-blue-100 text-blue-800',
  ocupada: 'bg-yellow-100 text-yellow-800',
  completada: 'bg-purple-100 text-purple-800',
  cancelada: 'bg-red-100 text-red-800'
};
const reservationStatusLabels = { confirmada: 'Confirmada', ocupada: 'En mesa', completada: 'Completada', cancelada: 'Cancelada' };

function ReservacionesAdmin() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');

  const load = () => reservationsApi.getAll(date || undefined).then(setReservas).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [date]);

  const cancelar = async (id) => {
    setError('');
    try {
      await reservationsApi.setStatus(id, 'cancelada');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="flex items-center gap-2 mb-4">
        <label className="text-xs font-bold uppercase tracking-widest text-ink-400">Fecha</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white" />
        {date && <button onClick={() => setDate('')} className="text-xs text-brand-600 hover:underline">Ver todas las próximas</button>}
      </div>
      <div className="space-y-2">
        {reservas.length === 0 ? (
          <div className="text-center py-12 text-ink-400">No hay reservaciones</div>
        ) : (
          reservas.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-ink-900">{r.mesa_name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${reservationStatusColors[r.status] || ''}`}>{reservationStatusLabels[r.status] || r.status}</span>
                  <span className="text-xs text-ink-400">{r.date} · {r.time}</span>
                </div>
                <div className="text-sm text-ink-500 mt-0.5">{r.customer_name} · 📞 {r.customer_phone} · 👥 {r.party_size}</div>
                {r.notes && <div className="text-xs text-ink-400 mt-1">📝 {r.notes}</div>}
              </div>
              {['confirmada', 'ocupada'].includes(r.status) && (
                <button onClick={() => cancelar(r.id)} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200">Cancelar</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function fmtHour(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

const periodLabels = { day: 'Día', week: 'Semana', month: 'Mes' };

function ReportesGuardadosAdmin() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = () => reportsApi.getSaved(filter || undefined).then(setSaved).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [filter]);

  const ver = async (id) => {
    try {
      const row = await reportsApi.getSavedById(id);
      printSalesReport(row.data, row.period, row.date);
    } catch (e) {
      setError(e.message);
    }
  };

  const eliminar = async (id) => {
    try {
      await reportsApi.deleteSaved(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="flex gap-1 bg-ink-100 rounded-lg p-1 mb-4 w-fit">
        {[['', 'Todos'], ['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${filter === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {saved.length === 0 ? (
          <div className="text-center py-12 text-ink-400">No hay reportes guardados</div>
        ) : (
          saved.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream-100 text-ink-600">{periodLabels[r.period]}</span>
                  <span className="font-black text-ink-900">{r.date}</span>
                  {r.auto ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Automático</span> : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Manual</span>}
                </div>
                <div className="text-sm text-ink-500 mt-0.5">{formatPrice(r.total_revenue)} · {r.order_count} órdenes · guardado {new Date(r.created_at + 'Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => ver(r.id)} className="text-xs bg-ink-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-ink-900">🖨️ Ver / Imprimir</button>
                <button onClick={() => eliminar(r.id)} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReportesAdmin() {
  const [view, setView] = useState('actual');
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    reportsApi.getSales(period, date).then(setReport).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [period, date]);

  const guardar = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await reportsApi.save(period, date);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const maxHourly = report ? Math.max(1, ...report.hourly.map(h => h.orders)) : 1;
  const maxProduct = report && report.topProducts.length ? Math.max(...report.topProducts.map(p => p.quantity)) : 1;

  return (
    <div>
      <div className="flex gap-1 bg-ink-100 rounded-lg p-1 mb-6 w-fit">
        {[['actual', 'Reporte Actual'], ['guardados', 'Reportes Guardados']].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${view === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
        ))}
      </div>

      {view === 'guardados' ? <ReportesGuardadosAdmin /> : (
      <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
          {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${period === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setSaved(false); }} className="border border-ink-200 rounded-lg p-2 text-sm bg-white" />
          {report && (
            <>
              <button onClick={guardar} disabled={saving} className="text-xs bg-brand-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-brand-600 disabled:opacity-50">{saving ? 'Guardando…' : saved ? '✓ Guardado' : '💾 Guardar Reporte'}</button>
              <button onClick={() => printSalesReport(report, period, date)} className="text-xs bg-ink-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-ink-900">🖨️ Generar PDF</button>
              <button onClick={() => downloadSalesCSV(report, period, date)} className="text-xs bg-cream-100 text-ink-700 px-3 py-2 rounded-lg font-bold hover:bg-cream-200">⬇️ CSV</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {loading || !report ? (
        <div className="text-center py-12 text-ink-400">Cargando...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
              <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Ingresos totales</div>
              <div className="text-2xl font-black text-brand-600 mt-1">{formatPrice(report.totalRevenue)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
              <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Órdenes pagadas</div>
              <div className="text-2xl font-black text-ink-900 mt-1">{report.orderCount}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
              <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Ticket promedio</div>
              <div className="text-2xl font-black text-ink-900 mt-1">{formatPrice(report.avgTicket)}</div>
            </div>
          </div>

          {report.peakHour ? (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-brand-800 text-sm font-semibold">
              🕐 La hora con más ventas fue las <span className="font-black">{fmtHour(report.peakHour.hour)}</span>, con {report.peakHour.orders} órdenes y {formatPrice(report.peakHour.revenue)}.
            </div>
          ) : (
            <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 text-ink-500 text-sm">Sin ventas registradas en este periodo.</div>
          )}

          <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
            <h3 className="font-bold text-ink-900 mb-3">Productos más vendidos</h3>
            {report.topProducts.length === 0 ? (
              <div className="text-center py-6 text-ink-400 text-sm">Sin ventas en este periodo</div>
            ) : (
              <div className="space-y-2">
                {report.topProducts.map(p => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-32 sm:w-40 text-sm text-ink-700 truncate">{p.name}</div>
                    <div className="flex-1 bg-cream-100 rounded-full h-5 relative overflow-hidden">
                      <div className="bg-brand-500 h-5 rounded-full" style={{ width: `${(p.quantity / maxProduct) * 100}%` }} />
                    </div>
                    <div className="w-14 text-right text-sm font-bold text-ink-900">{p.quantity}</div>
                    <div className="w-20 text-right text-xs text-ink-400">{formatPrice(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
            <h3 className="font-bold text-ink-900 mb-3">Ventas por hora</h3>
            <div className="flex items-end gap-1 h-32">
              {report.hourly.map(h => (
                <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className={`w-full rounded-t ${h.orders > 0 ? 'bg-brand-400' : 'bg-cream-100'}`}
                    style={{ height: `${Math.max((h.orders / maxHourly) * 100, h.orders > 0 ? 4 : 2)}%` }}
                    title={`${fmtHour(h.hour)}: ${h.orders} órdenes, ${formatPrice(h.revenue)}`} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-ink-400 mt-1">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
            </div>
          </div>

          {report.daily.length > 0 && (
            <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
              <h3 className="font-bold text-ink-900 mb-3">Ventas por día</h3>
              <div className="space-y-1">
                {report.daily.map(d => (
                  <div key={d.date} className="flex items-center justify-between text-sm border-b border-ink-50 py-1.5">
                    <span className="text-ink-600">{d.date}</span>
                    <span className="text-ink-400">{d.orders} órdenes</span>
                    <span className="font-bold text-ink-900">{formatPrice(d.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
            <h3 className="font-bold text-ink-900 mb-3">Ventas por método de pago</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {report.paymentBreakdown.length === 0 ? (
                <div className="text-center py-2 text-ink-400 text-sm sm:col-span-3">Sin ventas en este periodo</div>
              ) : report.paymentBreakdown.map(p => (
                <div key={p.method} className="bg-cream-50 rounded-lg p-3">
                  <div className="text-xs text-ink-400 uppercase font-semibold">{p.method}</div>
                  <div className="font-black text-ink-900">{formatPrice(p.revenue)}</div>
                  <div className="text-xs text-ink-400">{p.count} órdenes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </>
      )}
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

function ChipToggleGroup({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition ${active ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-ink-200 text-ink-500 hover:border-ink-300'}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function HireForm({ onHired, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'mesero', puesto: '', salario: '', periodo_pago: 'semanal', prestaciones: [], dias_laborales: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (field, value) => {
    setForm(f => ({ ...f, [field]: f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) { setError('Nombre, email y contraseña son requeridos'); return; }
    setSaving(true);
    try {
      await employeesApi.hire({ ...form, salario: parseFloat(form.salario) || 0 });
      onHired();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-brand-200 shadow-sm p-5 mb-6 space-y-4">
      <h3 className="font-bold text-ink-900">Contratar nuevo empleado</h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Contraseña (mín. 6 caracteres)" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" className="border border-ink-200 rounded-lg p-2 text-sm" />
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })} placeholder="Puesto (ej. Mesero de fin de semana)" className="border border-ink-200 rounded-lg p-2 text-sm" />
        <input type="number" min="0" value={form.salario} onChange={e => setForm({ ...form, salario: e.target.value })} placeholder="Salario" className="border border-ink-200 rounded-lg p-2 text-sm" />
        <select value={form.periodo_pago} onChange={e => setForm({ ...form, periodo_pago: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1.5">Prestaciones</div>
        <ChipToggleGroup options={PRESTACIONES_OPCIONES} selected={form.prestaciones} onToggle={v => toggle('prestaciones', v)} />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1.5">Días laborales</div>
        <ChipToggleGroup options={DIAS_SEMANA} selected={form.dias_laborales} onToggle={v => toggle('dias_laborales', v)} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
          {saving ? 'Contratando…' : '+ Contratar'}
        </button>
        <button type="button" onClick={onCancel} className="text-ink-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ink-50">Cancelar</button>
      </div>
    </form>
  );
}

function EmployeeCard({ empleado, isSelf, onSaved, onStatusChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ puesto: empleado.puesto, salario: empleado.salario, periodo_pago: empleado.periodo_pago, prestaciones: empleado.prestaciones, dias_laborales: empleado.dias_laborales, role: empleado.role });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (field, value) => {
    setForm(f => ({ ...f, [field]: f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value] }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await employeesApi.update(empleado.id, { ...form, salario: parseFloat(form.salario) || 0 });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-xl border-2 border-brand-300 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink-900">{empleado.name}</span>
          <span className="text-xs text-ink-400">{empleado.email}</span>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-xs">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })} placeholder="Puesto" className="border border-ink-200 rounded-lg p-2 text-sm" />
          <input type="number" min="0" value={form.salario} onChange={e => setForm({ ...form, salario: e.target.value })} placeholder="Salario" className="border border-ink-200 rounded-lg p-2 text-sm" />
          <select value={form.periodo_pago} onChange={e => setForm({ ...form, periodo_pago: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1.5">Prestaciones</div>
          <ChipToggleGroup options={PRESTACIONES_OPCIONES} selected={form.prestaciones} onToggle={v => toggle('prestaciones', v)} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1.5">Días laborales</div>
          <ChipToggleGroup options={DIAS_SEMANA} selected={form.dias_laborales} onToggle={v => toggle('dias_laborales', v)} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-600 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          <button onClick={() => setEditing(false)} className="text-ink-500 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-ink-50">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${empleado.active ? 'border-ink-100' : 'border-red-200 bg-red-50/40'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink-900">{empleado.name}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream-100 text-ink-600">{roleLabels[empleado.role] || empleado.role}</span>
            {empleado.puesto && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{empleado.puesto}</span>}
            {!empleado.active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Despedido</span>}
          </div>
          <div className="text-sm text-ink-500 mt-0.5">{empleado.email}{empleado.phone && ` · ${empleado.phone}`}</div>
          <div className="text-xs text-ink-400 mt-1">
            Contratado: {empleado.fecha_contratacion || '—'}
            {empleado.fecha_baja && ` · Dado de baja: ${empleado.fecha_baja}`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isSelf && (
            <>
              <button onClick={() => setEditing(true)} className="text-xs px-3 py-2 rounded-lg font-bold bg-cream-100 text-ink-600 hover:bg-cream-200">Editar</button>
              <button
                onClick={() => onStatusChange(empleado, !empleado.active)}
                className={`text-xs px-3 py-2 rounded-lg font-bold ${empleado.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                {empleado.active ? 'Despedir' : 'Recontratar'}
              </button>
            </>
          )}
          {isSelf && <span className="text-xs text-ink-400 italic">Tu cuenta</span>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-ink-100">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Salario</div>
          <div className="text-sm font-bold text-ink-900">{formatPrice(empleado.salario)} <span className="font-normal text-ink-400">/ {PERIODOS.find(p => p.value === empleado.periodo_pago)?.label.toLowerCase()}</span></div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Días laborales</div>
          <div className="text-sm text-ink-700">{empleado.dias_laborales.length ? empleado.dias_laborales.join(', ') : '—'}</div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-1">Prestaciones</div>
          <div className="text-sm text-ink-700">{empleado.prestaciones.length ? empleado.prestaciones.join(', ') : '—'}</div>
        </div>
      </div>
    </div>
  );
}

function EmpleadosAdmin() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiring, setHiring] = useState(false);
  const [filter, setFilter] = useState('activos');
  const { user: currentUser } = useAuth();

  const load = () => employeesApi.getAll().then(setEmpleados).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleStatusChange = async (empleado, active) => {
    setError('');
    try {
      await employeesApi.setStatus(empleado.id, active);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const visibles = empleados.filter(e => filter === 'todos' || (filter === 'activos' ? e.active : !e.active));

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
          {[['activos', 'Activos'], ['despedidos', 'Despedidos'], ['todos', 'Todos']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${filter === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
          ))}
        </div>
        {!hiring && <button onClick={() => setHiring(true)} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+ Contratar Empleado</button>}
      </div>

      {hiring && <HireForm onHired={() => { setHiring(false); load(); }} onCancel={() => setHiring(false)} />}

      <div className="space-y-3">
        {visibles.length === 0 ? (
          <div className="text-center py-12 text-ink-400">No hay empleados en esta categoría</div>
        ) : (
          visibles.map(empleado => (
            <EmployeeCard
              key={empleado.id}
              empleado={empleado}
              isSelf={empleado.id === currentUser?.id}
              onSaved={load}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      <div className="mt-8">
        <CuentasPruebaAdmin />
      </div>
    </div>
  );
}

function CuentasPruebaAdmin() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const buscar = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setResult(null);
    setConfirming(false);
    setLoading(true);
    try {
      const user = await usersApi.lookup(email.trim());
      setResult(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async () => {
    setError('');
    try {
      await usersApi.delete(result.id);
      setResult(null);
      setEmail('');
      setConfirming(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-5">
      <h3 className="font-bold text-ink-900 mb-1">Cuentas de Prueba</h3>
      <p className="text-xs text-ink-400 mb-4">Busca una cuenta por email para eliminarla y poder reutilizar ese correo en pruebas. Un empleado desactivado (despedido) sigue bloqueando su email aunque no lo elimines aquí — así nadie puede volver a registrarse con ese correo.</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={buscar} className="flex gap-2 mb-4">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="flex-1 border border-ink-200 rounded-lg p-2 text-sm" />
        <button type="submit" disabled={loading} className="bg-ink-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-ink-900 disabled:opacity-50">{loading ? 'Buscando…' : 'Buscar'}</button>
      </form>
      {result && (
        <div className="bg-cream-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink-900">{result.name}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">{result.role}</span>
            {!result.active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Desactivado</span>}
          </div>
          <div className="text-sm text-ink-500">{result.email}</div>
          {result.hasHistory ? (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">Esta cuenta tiene historial (pedidos, reportes o gastos) y no se puede eliminar — usa "Desactivar" en Empleados/Socios si necesitas bloquearla.</p>
          ) : confirming ? (
            <div className="flex gap-2">
              <button onClick={eliminar} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-700">Sí, eliminar permanentemente</button>
              <button onClick={() => setConfirming(false)} className="text-ink-500 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-ink-100">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-200">🗑️ Eliminar Permanentemente</button>
          )}
        </div>
      )}
    </div>
  );
}

function SocioHireForm({ onHired, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) { setError('Nombre, email y contraseña son requeridos'); return; }
    setSaving(true);
    try {
      await sociosApi.create(form);
      onHired();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-brand-200 shadow-sm p-5 mb-6 space-y-4">
      <h3 className="font-bold text-ink-900">Agregar socio / dueño</h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Contraseña (mín. 6 caracteres)" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" className="border border-ink-200 rounded-lg p-2 text-sm" />
      </div>
      <p className="text-xs text-ink-400">El socio tendrá acceso de solo lectura a la app de Socios (reportes de ventas y salud del negocio); no puede editar menú, empleados ni mesas.</p>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
          {saving ? 'Guardando…' : '+ Agregar Socio'}
        </button>
        <button type="button" onClick={onCancel} className="text-ink-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ink-50">Cancelar</button>
      </div>
    </form>
  );
}

function SociosAdmin() {
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiring, setHiring] = useState(false);

  const load = () => sociosApi.getAll().then(setSocios).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleStatusChange = async (socio, active) => {
    setError('');
    try {
      await sociosApi.setStatus(socio.id, active);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-ink-500">Cuentas con acceso a la app de Socios (reportes y salud del negocio, solo lectura).</p>
        {!hiring && <button onClick={() => setHiring(true)} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+ Agregar Socio</button>}
      </div>

      {hiring && <SocioHireForm onHired={() => { setHiring(false); load(); }} onCancel={() => setHiring(false)} />}

      <div className="space-y-3">
        {socios.length === 0 ? (
          <div className="text-center py-12 text-ink-400">No hay socios registrados</div>
        ) : (
          socios.map(socio => (
            <div key={socio.id} className={`bg-white rounded-xl border p-4 shadow-sm flex items-center justify-between flex-wrap gap-3 ${socio.active ? 'border-ink-100' : 'border-red-200 bg-red-50/40'}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-ink-900">{socio.name}</span>
                  {!socio.active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Desactivado</span>}
                </div>
                <div className="text-sm text-ink-500 mt-0.5">{socio.email}{socio.phone && ` · ${socio.phone}`}</div>
              </div>
              <button
                onClick={() => handleStatusChange(socio, !socio.active)}
                className={`text-xs px-3 py-2 rounded-lg font-bold ${socio.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                {socio.active ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExpenseForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(editing || { category: 'renta', description: '', amount: '', date: todayStr(), payment_method: 'efectivo' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category || !form.amount || !form.date) { setError('Categoría, monto y fecha son requeridos'); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editing) await expensesApi.update(editing.id, payload);
      else await expensesApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-brand-200 shadow-sm p-5 mb-6 space-y-4">
      <h3 className="font-bold text-ink-900">{editing ? 'Editar gasto' : 'Registrar gasto'}</h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Monto" className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm" required />
        <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
        <input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción (opcional)" className="border border-ink-200 rounded-lg p-2 text-sm sm:col-span-2" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
          {saving ? 'Guardando…' : editing ? 'Guardar Cambios' : '+ Registrar Gasto'}
        </button>
        <button type="button" onClick={onCancel} className="text-ink-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ink-50">Cancelar</button>
      </div>
    </form>
  );
}

function GastosAdmin() {
  const [expensesList, setExpensesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    const params = {};
    if (categoryFilter) params.category = categoryFilter;
    if (from) params.from = from;
    if (to) params.to = to;
    expensesApi.getAll(params).then(setExpensesList).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [categoryFilter, from, to]);

  const total = expensesList.reduce((s, e) => s + e.amount, 0);

  const eliminar = async (id) => {
    setError('');
    try {
      await expensesApi.delete(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
            <option value="">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white" placeholder="Desde" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white" placeholder="Hasta" />
        </div>
        {!adding && !editing && <button onClick={() => setAdding(true)} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+ Registrar Gasto</button>}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100 mb-6 flex items-center justify-between">
        <span className="text-xs text-ink-400 font-medium uppercase tracking-wider">Total {categoryFilter ? EXPENSE_CATEGORY_LABELS[categoryFilter] : 'de gastos'} {(from || to) ? '(filtrado)' : ''}</span>
        <span className="text-xl font-black text-ink-900">{formatPrice(total)}</span>
      </div>

      {adding && <ExpenseForm onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}
      {editing && <ExpenseForm editing={editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}

      <div className="space-y-2">
        {expensesList.length === 0 ? (
          <div className="text-center py-12 text-ink-400">No hay gastos registrados</div>
        ) : (
          expensesList.map(exp => (
            <div key={exp.id} className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream-100 text-ink-600">{EXPENSE_CATEGORY_LABELS[exp.category] || exp.category}</span>
                  <span className="font-black text-ink-900">{formatPrice(exp.amount)}</span>
                  <span className="text-xs text-ink-400">{exp.date}</span>
                </div>
                {exp.description && <div className="text-sm text-ink-500 mt-0.5">{exp.description}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(exp); setAdding(false); }} className="text-xs bg-cream-100 text-ink-600 px-3 py-2 rounded-lg font-bold hover:bg-cream-200">Editar</button>
                <button onClick={() => eliminar(exp.id)} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const SUPPLY_UNITS = ['pieza', 'kg', 'g', 'litro', 'ml', 'paquete', 'caja', 'bolsa'];

function SupplyForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', unit: 'pieza', purchased: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Nombre requerido'); return; }
    setSaving(true);
    try {
      await suppliesApi.create({ ...form, purchased: parseFloat(form.purchased) || 0 });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-brand-200 shadow-sm p-5 mb-6 space-y-4">
      <h3 className="font-bold text-ink-900">Nuevo insumo</h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-sm">{error}</div>}
      <div className="grid sm:grid-cols-3 gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej. Tortillas)" className="border border-ink-200 rounded-lg p-2 text-sm sm:col-span-2" required />
        <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          {SUPPLY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="number" min="0" step="0.01" value={form.purchased} onChange={e => setForm({ ...form, purchased: e.target.value })} placeholder="Cantidad comprada esta semana" className="border border-ink-200 rounded-lg p-2 text-sm sm:col-span-3" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 disabled:opacity-50">{saving ? 'Guardando…' : '+ Agregar Insumo'}</button>
        <button type="button" onClick={onCancel} className="text-ink-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ink-50">Cancelar</button>
      </div>
    </form>
  );
}

function SupplyCard({ supply, onSaved }) {
  const [editingPurchase, setEditingPurchase] = useState(false);
  const [purchaseVal, setPurchaseVal] = useState(supply.purchased);
  const [saving, setSaving] = useState(false);

  const ratio = supply.purchased > 0 ? Math.max(0, supply.remaining) / supply.purchased : 0;
  const remainingColor = supply.remaining <= 0 ? 'bg-red-100 text-red-700' : ratio <= 0.25 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  const savePurchase = async () => {
    setSaving(true);
    try {
      await suppliesApi.setPurchased(supply.id, parseFloat(purchaseVal) || 0);
      setEditingPurchase(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    await suppliesApi.delete(supply.id);
    onSaved();
  };

  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-ink-900">{supply.name}</span>
        <span className="text-xs text-ink-400">{supply.unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <div className="text-xs text-ink-400 uppercase">Comprado</div>
          <div className="font-bold text-ink-900">{supply.purchased}</div>
        </div>
        <div>
          <div className="text-xs text-ink-400 uppercase">Consumido</div>
          <div className="font-bold text-ink-900">{supply.consumed}</div>
        </div>
        <div>
          <div className="text-xs text-ink-400 uppercase">Restante</div>
          <div className={`font-bold px-2 py-0.5 rounded-full inline-block ${remainingColor}`}>{supply.remaining}</div>
        </div>
      </div>
      {editingPurchase ? (
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="0.01" value={purchaseVal} onChange={e => setPurchaseVal(e.target.value)} className="flex-1 border border-ink-200 rounded-lg p-1.5 text-sm" autoFocus />
          <button onClick={savePurchase} disabled={saving} className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-brand-600">✓</button>
          <button onClick={() => setEditingPurchase(false)} className="text-xs text-ink-400 px-2">✕</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => { setPurchaseVal(supply.purchased); setEditingPurchase(true); }} className="flex-1 text-xs bg-cream-100 text-ink-600 px-3 py-2 rounded-lg font-bold hover:bg-cream-200">📦 Registrar Compra</button>
          <button onClick={eliminar} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200">Eliminar</button>
        </div>
      )}
    </div>
  );
}

function InsumosListAdmin() {
  const [suppliesList, setSuppliesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => suppliesApi.getAll().then(setSuppliesList).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <div className="flex justify-end mb-4">
        {!adding && <button onClick={() => setAdding(true)} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+ Agregar Insumo</button>}
      </div>
      {adding && <SupplyForm onCreated={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}
      {suppliesList.length === 0 ? (
        <div className="text-center py-12 text-ink-400">No hay insumos registrados</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliesList.map(s => <SupplyCard key={s.id} supply={s} onSaved={load} />)}
        </div>
      )}
    </div>
  );
}

function RecetasAdmin({ menuData }) {
  const allItems = menuData.flatMap(c => c.items.map(i => ({ ...i, categoryName: c.name })));
  const [selectedItem, setSelectedItem] = useState('');
  const [suppliesList, setSuppliesList] = useState([]);
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ supply_item_id: '', quantity_per_unit: '1' });
  const [error, setError] = useState('');

  useEffect(() => { suppliesApi.getAll().then(setSuppliesList).catch(e => setError(e.message)); }, []);

  const loadLinks = (itemId) => {
    if (!itemId) { setLinks([]); return; }
    suppliesApi.getRecipes(itemId).then(setLinks).catch(e => setError(e.message));
  };

  useEffect(() => { loadLinks(selectedItem); }, [selectedItem]);

  const addLink = async () => {
    if (!selectedItem || !newLink.supply_item_id) return;
    setError('');
    try {
      await suppliesApi.createRecipe({ menu_item_id: Number(selectedItem), supply_item_id: Number(newLink.supply_item_id), quantity_per_unit: parseFloat(newLink.quantity_per_unit) || 1 });
      setNewLink({ supply_item_id: '', quantity_per_unit: '1' });
      loadLinks(selectedItem);
    } catch (e) {
      setError(e.message);
    }
  };

  const removeLink = async (id) => {
    await suppliesApi.deleteRecipe(id);
    loadLinks(selectedItem);
  };

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <p className="text-sm text-ink-500 mb-4">Define cuánto de cada insumo consume una unidad de cada platillo. Al vender ese platillo, el sistema descuenta automáticamente los insumos vinculados.</p>
      <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white mb-4 w-full sm:w-auto">
        <option value="">Selecciona un platillo...</option>
        {allItems.map(i => <option key={i.id} value={i.id}>{i.categoryName} · {i.name}</option>)}
      </select>

      {selectedItem && (
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
          <div className="space-y-2 mb-4">
            {links.length === 0 ? (
              <div className="text-center py-4 text-ink-400 text-sm">Sin insumos vinculados a este platillo</div>
            ) : (
              links.map(l => (
                <div key={l.id} className="flex items-center justify-between bg-cream-50 rounded-lg p-2.5">
                  <span className="text-sm text-ink-700">{l.supply_name} · {l.quantity_per_unit} {l.supply_unit} por unidad</span>
                  <button onClick={() => removeLink(l.id)} className="text-xs text-red-500 hover:underline">Quitar</button>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={newLink.supply_item_id} onChange={e => setNewLink({ ...newLink, supply_item_id: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white flex-1">
              <option value="">Insumo...</option>
              {suppliesList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
            </select>
            <input type="number" min="0.01" step="0.01" value={newLink.quantity_per_unit} onChange={e => setNewLink({ ...newLink, quantity_per_unit: e.target.value })} placeholder="Cantidad" className="border border-ink-200 rounded-lg p-2 text-sm w-28" />
            <button onClick={addLink} className="bg-brand-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+ Vincular</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistorialInsumosAdmin() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { suppliesApi.getHistory().then(setHistory).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  const weeksMap = new Map();
  for (const h of history) {
    const key = `${h.week_start}_${h.week_end}`;
    if (!weeksMap.has(key)) weeksMap.set(key, []);
    weeksMap.get(key).push(h);
  }
  const weeks = [...weeksMap.entries()];

  return (
    <div className="space-y-6">
      {weeks.length === 0 ? (
        <div className="text-center py-12 text-ink-400">Aún no hay semanas cerradas para mostrar recuento</div>
      ) : (
        weeks.map(([key, rows]) => (
          <div key={key} className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
            <h3 className="font-bold text-ink-900 mb-3">Semana {rows[0].week_start} — {rows[0].week_end}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-400 uppercase text-left">
                    <th className="pb-2">Insumo</th>
                    <th className="pb-2 text-right">Comprado</th>
                    <th className="pb-2 text-right">Consumido</th>
                    <th className="pb-2 text-right">Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-ink-50">
                      <td className="py-1.5">{r.supply_name} <span className="text-ink-400">({r.unit})</span></td>
                      <td className="py-1.5 text-right">{r.purchased}</td>
                      <td className="py-1.5 text-right">{r.consumed}</td>
                      <td className={`py-1.5 text-right font-bold ${r.remaining < 0 ? 'text-red-600' : 'text-ink-900'}`}>{r.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function InsumosAdmin({ menuData }) {
  const [view, setView] = useState('insumos');
  return (
    <div>
      <div className="flex gap-1 bg-ink-100 rounded-lg p-1 mb-6 w-fit">
        {[['insumos', 'Insumos'], ['recetas', 'Recetas'], ['historial', 'Historial Semanal']].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${view === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
        ))}
      </div>
      {view === 'insumos' && <InsumosListAdmin />}
      {view === 'recetas' && <RecetasAdmin menuData={menuData} />}
      {view === 'historial' && <HistorialInsumosAdmin />}
    </div>
  );
}

function AssetForm({ editing, onSaved, onCancel }) {
  const [form, setForm] = useState(editing
    ? { ...editing, purchase_date: editing.purchase_date || '' }
    : { name: '', category: 'otro', quantity: 1, purchase_price: '', purchase_date: '', condition: 'bueno', location: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Nombre requerido'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity, 10) || 1,
        purchase_price: parseFloat(form.purchase_price) || 0,
        purchase_date: form.purchase_date || null
      };
      if (editing) await assetsApi.update(editing.id, payload);
      else await assetsApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-brand-200 shadow-sm p-5 mb-6 space-y-4">
      <h3 className="font-bold text-ink-900">{editing ? 'Editar activo' : 'Nuevo activo'}</h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej. Refrigerador)" className="border border-ink-200 rounded-lg p-2 text-sm sm:col-span-2" required />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          {ASSET_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Cantidad" className="border border-ink-200 rounded-lg p-2 text-sm" />
        <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} placeholder="Precio de compra (por unidad)" className="border border-ink-200 rounded-lg p-2 text-sm" />
        <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className="border border-ink-200 rounded-lg p-2 text-sm" />
        <input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ubicación (ej. Cocina, Salón)" className="border border-ink-200 rounded-lg p-2 text-sm" />
        <input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas (opcional)" className="border border-ink-200 rounded-lg p-2 text-sm sm:col-span-2" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
          {saving ? 'Guardando…' : editing ? 'Guardar Cambios' : '+ Agregar Activo'}
        </button>
        <button type="button" onClick={onCancel} className="text-ink-500 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-ink-50">Cancelar</button>
      </div>
    </form>
  );
}

function AssetCard({ asset, onEdit, onDeleted }) {
  const cond = ASSET_CONDITION_MAP[asset.condition] || ASSET_CONDITIONS[1];
  const eliminar = async () => {
    await assetsApi.delete(asset.id);
    onDeleted();
  };

  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold text-ink-900">{asset.name}</div>
          <div className="text-xs text-ink-400 mt-0.5">{ASSET_CATEGORY_LABELS[asset.category]}{asset.location && ` · ${asset.location}`}</div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cond.color}`}>{cond.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div><span className="text-ink-400">Cantidad:</span> <span className="font-semibold text-ink-900">{asset.quantity}</span></div>
        <div><span className="text-ink-400">Valor:</span> <span className="font-semibold text-ink-900">{formatPrice(asset.purchase_price * asset.quantity)}</span></div>
      </div>
      {asset.purchase_date && <div className="text-xs text-ink-400 mb-1">Comprado: {asset.purchase_date}</div>}
      {asset.notes && <div className="text-xs text-ink-500 bg-cream-50 rounded p-2 mb-2">📝 {asset.notes}</div>}
      <div className="flex gap-2 mt-2">
        <button onClick={() => onEdit(asset)} className="flex-1 text-xs bg-cream-100 text-ink-600 px-3 py-2 rounded-lg font-bold hover:bg-cream-200">Editar</button>
        <button onClick={eliminar} className="text-xs bg-red-100 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-200">Eliminar</button>
      </div>
    </div>
  );
}

function ActivosAdmin() {
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [summary, setSummary] = useState(null);

  const load = () => {
    Promise.all([assetsApi.getAll(categoryFilter || undefined), assetsApi.getSummary()])
      .then(([list, sum]) => { setAssetsList(list); setSummary(sum); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [categoryFilter]);

  const grouped = new Map();
  for (const a of assetsList) {
    if (!grouped.has(a.category)) grouped.set(a.category, []);
    grouped.get(a.category).push(a);
  }

  if (loading) return <div className="text-center py-12 text-ink-400">Cargando...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
            <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Valor Total</div>
            <div className="text-xl font-black text-brand-600 mt-1">{formatPrice(summary.totalValue)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
            <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Total de Artículos</div>
            <div className="text-xl font-black text-ink-900 mt-1">{summary.totalItems}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
            <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Tipos de Activos</div>
            <div className="text-xl font-black text-ink-900 mt-1">{summary.assetCount}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
          <option value="">Todas las categorías</option>
          {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {!adding && !editing && <button onClick={() => setAdding(true)} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-600">+ Agregar Activo</button>}
      </div>

      {adding && <AssetForm onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}
      {editing && <AssetForm editing={editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}

      {assetsList.length === 0 ? (
        <div className="text-center py-12 text-ink-400">No hay activos registrados</div>
      ) : categoryFilter ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assetsList.map(a => <AssetCard key={a.id} asset={a} onEdit={(x) => { setEditing(x); setAdding(false); }} onDeleted={load} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink-400 mb-3">{ASSET_CATEGORY_LABELS[cat] || cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(a => <AssetCard key={a.id} asset={a} onEdit={(x) => { setEditing(x); setAdding(false); }} onDeleted={load} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangeBadge({ pct, invert }) {
  if (pct === null || pct === undefined) return <span className="text-xs text-ink-400">sin dato previo</span>;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${good ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs. periodo anterior
    </span>
  );
}

function FinanzasAdmin() {
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    reportsApi.getFinance(period, date).then(setOverview).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [period, date]);

  if (loading || !overview) {
    return (
      <div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <div className="text-center py-12 text-ink-400">Cargando...</div>
      </div>
    );
  }

  const totalCosts = overview.payrollEstimate + overview.expensesTotal;
  const maxCategoryValue = overview.expensesByCategory.length ? Math.max(...overview.expensesByCategory.map(c => c.total)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
          {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${period === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white" />
          <button onClick={() => printFinanceOverview(overview, period, date)} className="text-xs bg-ink-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-ink-900">🖨️ PDF</button>
          <button onClick={() => downloadFinanceCSV(overview, period, date)} className="text-xs bg-cream-100 text-ink-700 px-3 py-2 rounded-lg font-bold hover:bg-cream-200">⬇️ CSV</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-6">
        {/* Estado de Resultados */}
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-5">
          <h3 className="font-bold text-ink-900 mb-4">Estado de Resultados</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-ink-50">
              <span className="text-ink-600">Ingresos</span>
              <div className="flex items-center gap-2">
                <ChangeBadge pct={overview.changePct.revenue} />
                <span className="font-bold text-ink-900 w-28 text-right">{formatPrice(overview.totalRevenue)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-ink-50">
              <span className="text-ink-600">(-) Nómina</span>
              <span className="font-semibold text-ink-700 w-28 text-right">-{formatPrice(overview.payrollEstimate)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-ink-50">
              <span className="text-ink-600">(-) Gastos Operativos</span>
              <div className="flex items-center gap-2">
                <ChangeBadge pct={overview.changePct.costs} invert />
                <span className="font-semibold text-ink-700 w-28 text-right">-{formatPrice(overview.expensesTotal)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="font-bold text-ink-900">Utilidad Neta</span>
              <div className="flex items-center gap-2">
                <ChangeBadge pct={overview.changePct.profit} />
                <span className={`text-xl font-black w-28 text-right ${overview.profitEstimate >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatPrice(overview.profitEstimate)}</span>
              </div>
            </div>
            <div className="text-xs text-ink-400 pt-1">Margen de utilidad: <span className="font-bold">{overview.margin.toFixed(1)}%</span></div>
          </div>
          <p className="text-xs text-ink-400 italic mt-4">{overview.estimateNote}</p>
        </div>

        {/* Patrimonio */}
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-5">
          <h3 className="font-bold text-ink-900 mb-4">Patrimonio (Activos)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-cream-50 rounded-lg p-3">
              <div className="text-xs text-ink-400 uppercase font-semibold">Valor Total</div>
              <div className="text-xl font-black text-ink-900 mt-1">{formatPrice(overview.assets.totalValue)}</div>
            </div>
            <div className="bg-cream-50 rounded-lg p-3">
              <div className="text-xs text-ink-400 uppercase font-semibold">Total de Artículos</div>
              <div className="text-xl font-black text-ink-900 mt-1">{overview.assets.totalItems}</div>
            </div>
            <div className="bg-cream-50 rounded-lg p-3">
              <div className="text-xs text-ink-400 uppercase font-semibold">Tipos de Activos</div>
              <div className="text-xl font-black text-ink-900 mt-1">{overview.assets.count}</div>
            </div>
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-5">
          <h3 className="font-bold text-ink-900 mb-4">Gastos Operativos por Categoría</h3>
          {overview.expensesByCategory.length === 0 ? (
            <div className="text-center py-6 text-ink-400 text-sm">Sin gastos registrados en este periodo</div>
          ) : (
            <div className="space-y-2">
              {overview.expensesByCategory.map(c => (
                <div key={c.category} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-ink-700 truncate">{EXPENSE_CATEGORY_LABELS[c.category] || c.category}</div>
                  <div className="flex-1 bg-cream-100 rounded-full h-5 relative overflow-hidden">
                    <div className="bg-brand-500 h-5 rounded-full" style={{ width: `${(c.total / maxCategoryValue) * 100}%` }} />
                  </div>
                  <div className="w-24 text-right text-sm font-bold text-ink-900">{formatPrice(c.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comparación con periodo anterior */}
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-5 overflow-x-auto">
          <h3 className="font-bold text-ink-900 mb-4">Comparación con Periodo Anterior</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-400 uppercase text-left">
                <th className="pb-2"></th>
                <th className="pb-2 text-right">Este Periodo</th>
                <th className="pb-2 text-right">Periodo Anterior</th>
                <th className="pb-2 text-right">Cambio</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-ink-50">
                <td className="py-2 text-ink-600">Ingresos</td>
                <td className="py-2 text-right font-semibold text-ink-900">{formatPrice(overview.totalRevenue)}</td>
                <td className="py-2 text-right text-ink-500">{formatPrice(overview.previousPeriod.totalRevenue)}</td>
                <td className="py-2 text-right"><ChangeBadge pct={overview.changePct.revenue} /></td>
              </tr>
              <tr className="border-t border-ink-50">
                <td className="py-2 text-ink-600">Costos Totales</td>
                <td className="py-2 text-right font-semibold text-ink-900">{formatPrice(totalCosts)}</td>
                <td className="py-2 text-right text-ink-500">{formatPrice(overview.previousPeriod.payrollEstimate + overview.previousPeriod.expensesTotal)}</td>
                <td className="py-2 text-right"><ChangeBadge pct={overview.changePct.costs} invert /></td>
              </tr>
              <tr className="border-t border-ink-50">
                <td className="py-2 text-ink-600">Utilidad Neta</td>
                <td className="py-2 text-right font-semibold text-ink-900">{formatPrice(overview.profitEstimate)}</td>
                <td className="py-2 text-right text-ink-500">{formatPrice(overview.previousPeriod.profitEstimate)}</td>
                <td className="py-2 text-right"><ChangeBadge pct={overview.changePct.profit} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
      <div className="sticky top-0 z-30">
        <div className="bg-ink-900 text-cream-50 py-4 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-black font-display">⚙️ Admin</h1>
          </div>
        </div>
        <div className="bg-white border-b border-ink-200">
          <div className="max-w-7xl mx-auto flex flex-wrap">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition ${tab === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-ink-400 hover:text-ink-600'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'Resumen' && <Resumen allOrders={allOrders} menuData={menuData} mesas={mesas} />}
        {tab === 'Finanzas' && <FinanzasAdmin />}
        {tab === 'Menú' && <MenuAdmin menuData={menuData} setMenuData={setMenuData} />}
        {tab === 'Personalización' && <PersonalizacionAdmin />}
        {tab === 'Mesas' && <MesasAdmin mesas={mesas} setMesas={setMesas} />}
        {tab === 'Reservaciones' && <ReservacionesAdmin />}
        {tab === 'Reportes' && <ReportesAdmin />}
        {tab === 'Gastos' && <GastosAdmin />}
        {tab === 'Insumos' && <InsumosAdmin menuData={menuData} />}
        {tab === 'Activos' && <ActivosAdmin />}
        {tab === 'Órdenes' && <OrdenesAdmin allOrders={allOrders} />}
        {tab === 'Historial' && <HistorialAdmin />}
        {tab === 'Empleados' && <EmpleadosAdmin />}
        {tab === 'Socios' && <SociosAdmin />}
      </div>
    </div>
  );
}
