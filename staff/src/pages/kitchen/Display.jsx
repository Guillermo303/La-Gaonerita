import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orders as ordersApi, menu as menuApi, customizations as customizationsApi } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice, statusLabels, typeLabels } from '../../lib/utils';

function ElapsedTimer({ created, status }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(created).getTime());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(created).getTime()), 1000);
    return () => clearInterval(id);
  }, [created]);

  const totalSec = Math.floor(elapsed / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const display = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}:${String(secs).padStart(2, '0')}`;

  const color = mins >= 10 ? 'text-red-500' : mins >= 5 ? 'text-yellow-500' : 'text-green-500';
  const urgent = mins >= 8 && status !== 'listo';

  return (
    <span className={`font-mono text-lg font-bold ${color} ${urgent ? 'animate-pulse' : ''}`}>
      {urgent ? '⚠️ ' : ''}{display}
    </span>
  );
}

function BigButton({ orders, onAdvance }) {
  const [flashing, setFlashing] = useState(false);

  const nextPendiente = orders.filter(o => o.status === 'pendiente').sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
  const nextPreparando = orders.filter(o => o.status === 'preparando').sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

  const target = nextPendiente || nextPreparando;
  if (!target) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-ink-400">
        <div className="text-8xl mb-6">🍃</div>
        <p className="text-2xl font-semibold">No hay órdenes pendientes</p>
      </div>
    </div>
  );

  const isPendiente = target.status === 'pendiente';
  const nextStatus = isPendiente ? 'preparando' : 'listo';
  const label = isPendiente ? 'Preparar' : 'Terminar';
  const color = isPendiente ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600';
  const icon = isPendiente ? '👨‍🍳' : '✅';

  const handlePress = () => {
    setFlashing(true);
    onAdvance(target.id, nextStatus);
    setTimeout(() => setFlashing(false), 300);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 select-none">
      <div className="text-center">
        <div className="text-xl text-ink-400 font-semibold mb-1">
          {isPendiente ? 'Siguiente orden pendiente' : 'Siguiente en preparación'}
        </div>
        <div className="text-5xl font-black text-ink-900">#{target.id}</div>
        <div className="text-lg text-ink-500 mt-1">{target.customer_name} · {target.order_type === 'domicilio' ? '🛵 Domicilio' : '🏠 Local'}</div>
        <ElapsedTimer created={target.created_at} status={target.status} />
      </div>
      <button onClick={handlePress}
        className={`w-56 h-56 sm:w-72 sm:h-72 rounded-full ${color} text-white text-3xl sm:text-4xl font-black uppercase tracking-wider shadow-2xl active:scale-95 transition-all duration-100 flex flex-col items-center justify-center gap-3 ${flashing ? 'ring-8 ring-white scale-95' : ''}`}>
        <span className="text-7xl">{icon}</span>
        <span>{label}</span>
      </button>
      <div className="text-sm text-ink-400">
        {target.items?.slice(0, 3).map(item => `${item.quantity}x ${item.name}`).join(' · ')}
        {target.items?.length > 3 && ' · · ·'}
      </div>
    </div>
  );
}

const activeStatusBadge = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  preparando: 'bg-blue-100 text-blue-800',
  listo: 'bg-green-100 text-green-800'
};

// Convierte la cantidad de la receta a un formato legible (ej: 0.07 -> "70g",
// 2 -> "2 piezas", 1.5 -> "1.5 kg"). Multiplicada por las unidades pedidas.
function fmtIngredient(qty, unit) {
  const isKg = unit && /kg|kilogramo/i.test(unit);
  const isGram = unit && /g|gr|gramo/i.test(unit);
  if (isKg && qty < 5) return `~${Math.round(qty * 1000)} g`;
  if (isGram && qty < 5) return `~${Math.round(qty * 1000)} g`;
  if (isGram) return `~${Math.round(qty)} g`;
  const value = Math.round(qty * 100) / 100;
  return `${value} ${unit || ''}`;
}

function IngredientBreakdown({ item, recipesByItem }) {
  const recipe = recipesByItem[item.menu_item_id];
  if (!recipe || !recipe.ingredients?.length) return null;
  const total = item.quantity || 1;
  return (
    <div className="mt-1 pl-4 border-l-2 border-ink-100 space-y-0.5">
      {recipe.description && <p className="text-sm text-gray-500 italic">{recipe.description}</p>}
      {recipe.ingredients.map((ing, i) => (
        <div key={i} className="flex justify-between text-sm text-gray-500">
          <span>{ing.name}</span>
          <span className="font-medium text-gray-700">{fmtIngredient(ing.quantity_per_unit * total, ing.unit)}</span>
        </div>
      ))}
    </div>
  );
}

const chipStatusColor = {
  pendiente: 'bg-yellow-400',
  preparando: 'bg-blue-500',
  listo: 'bg-green-500'
};

// Agrupa todos los productos de las órdenes activas por tipo (categoría del
// menú) y acumula cantidades, ingresos e ingredientes para la pantalla del
// chef: deja de ser una lista plana por pedido y se vuelve "qué hay que
// preparar en total". Cada producto conserva el detalle por orden (chip) para
// saber a qué pedido va cada pieza.
function buildChefGroups(orders, recipesByItem, menuAll, variantGroupMap) {
  const meta = new Map();
  for (const cat of menuAll || []) {
    for (const item of cat.items || []) {
      meta.set(item.id, { name: cat.name, catSort: cat.sort_order ?? 0, itemSort: item.sort_order ?? 0 });
    }
  }

  const byKey = new Map();
  for (const order of orders) {
    if (!['pendiente', 'preparando', 'listo'].includes(order.status)) continue;
    for (const it of order.items || []) {
      const key = it.menu_item_id ? `m${it.menu_item_id}` : `x${it.name}`;
      let p = byKey.get(key);
      if (!p) {
        const m = it.menu_item_id ? meta.get(it.menu_item_id) : null;
        p = {
          key,
          name: it.name,
          price: it.price,
          categoryName: m?.name || (it.menu_item_id ? 'Sin categoría' : 'Otros'),
          categorySort: m?.catSort ?? 999,
          itemSort: m?.itemSort ?? 999,
          total: 0,
          recipe: it.menu_item_id ? recipesByItem[it.menu_item_id] : null,
          orders: []
        };
        byKey.set(key, p);
      }
      p.total += it.quantity;
      p.orders.push({
        orderId: order.id,
        qty: it.quantity,
        status: order.status,
        orderType: order.order_type,
        variant: it.notes,
        variantGroup: it.notes ? (variantGroupMap?.get(it.notes) || it.notes) : null
      });
    }
  }

  const groups = new Map();
  for (const p of byKey.values()) {
    p.orders.sort((a, b) => a.orderId - b.orderId);
    const vTotals = new Map();
    for (const o of p.orders) {
      if (!o.variantGroup) continue;
      vTotals.set(o.variantGroup, (vTotals.get(o.variantGroup) || 0) + o.qty);
    }
    p.variantTotals = [...vTotals.entries()].map(([name, qty]) => ({ name, qty }));
    let g = groups.get(p.categoryName);
    if (!g) { g = { name: p.categoryName, sort: p.categorySort, items: [] }; groups.set(p.categoryName, g); }
    g.items.push(p);
  }

  return [...groups.values()]
    .map(g => {
      g.items.sort((a, b) => a.itemSort - b.itemSort || a.name.localeCompare(b.name));
      g.total = g.items.reduce((s, p) => s + p.total, 0);
      return g;
    })
    .sort((a, b) => a.sort - b.sort);
}

function ChefBoard({ orders, recipesByItem, menuAll, variantGroupMap }) {
  const groups = useMemo(() => buildChefGroups(orders, recipesByItem, menuAll, variantGroupMap), [orders, recipesByItem, menuAll, variantGroupMap]);

  const active = orders.filter(o => ['pendiente', 'preparando', 'listo'].includes(o.status));
  const totalUnits = groups.reduce((s, g) => s + g.total, 0);
  const totalRevenue = active.reduce((s, o) => s + (o.total || 0), 0);

  if (groups.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-6xl mb-4">🌮</div>
        <p className="text-lg font-semibold">No hay órdenes activas que preparar</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Órdenes activas</div>
          <div className="text-4xl font-black text-ink-900">{active.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Piezas a preparar</div>
          <div className="text-4xl font-black text-ink-900">{totalUnits}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Total por cobrar</div>
          <div className="text-4xl font-black text-ink-900">{formatPrice(totalRevenue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {groups.map(g => (
          <div key={g.name} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between bg-ink-900 text-white px-4 py-3">
              <h3 className="text-lg font-black uppercase tracking-wide">{g.name}</h3>
              <span className="text-2xl font-black">{g.total}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {g.items.map(p => (
                <div key={p.key} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-black text-ink-900">{p.total}×</span>
                    <span className="flex-1 text-lg font-bold text-ink-900">{p.name}</span>
                    <span className="text-sm font-semibold text-gray-400">{formatPrice(p.price * p.total)}</span>
                  </div>
                  {p.variantTotals.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {p.variantTotals.map(v => (
                        <span key={v.name} className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">{v.name} ×{v.qty}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.orders.map((o, i) => (
                      <span key={i}
                        title={`#${o.orderId} · ${typeLabels[o.orderType]}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                        <span className={`w-2 h-2 rounded-full ${chipStatusColor[o.status]}`}></span>
                        #{o.orderId} ×{o.qty}
                        {o.variant && <span className="font-medium text-gray-400">· {o.variant}</span>}
                      </span>
                    ))}
                  </div>
                  {p.recipe?.ingredients?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-0.5">
                      {p.recipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-500">
                          <span>{ing.name}</span>
                          <span className="font-bold text-gray-700">{fmtIngredient(ing.quantity_per_unit * p.total, ing.unit)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistorialActivas({ orders, onDeliver }) {
  const [delivering, setDelivering] = useState(null);
  const [entregadosHoy, setEntregadosHoy] = useState([]);

  useEffect(() => {
    ordersApi.getHistory().then(all => {
      const hoy = new Date().toDateString();
      setEntregadosHoy(all.filter(o => o.status === 'completado' && new Date(o.created_at).toDateString() === hoy));
    }).catch(() => {});
  }, [orders]);

  const sorted = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const handleDeliver = async (id) => {
    setDelivering(id);
    await onDeliver(id);
    setDelivering(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Órdenes Activas ({sorted.length})</h2>
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">🍃</div>
          <p className="text-lg">No hay órdenes activas en este momento</p>
        </div>
      ) : (
        <div className="space-y-2 mb-10">
          {sorted.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-black text-lg">#{order.id}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeStatusBadge[order.status]}`}>{statusLabels[order.status]}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.order_type === 'domicilio' ? '🛵' : '🏠'} {typeLabels[order.order_type]}</span>
                  <span className="font-semibold text-gray-800">{order.customer_name}</span>
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {order.items?.map(i => `${i.quantity}x ${i.name}`).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-gray-800">{formatPrice(order.total)}</span>
                <button
                  onClick={() => handleDeliver(order.id)}
                  disabled={delivering === order.id}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {delivering === order.id ? 'Marcando…' : '✅ Marcar Entregado'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entregadosHoy.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Entregados hoy ({entregadosHoy.length})</h3>
          <div className="space-y-1.5">
            {entregadosHoy.map(order => (
              <div key={order.id} className="bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold">#{order.id}</span>
                  <span className="text-gray-500">{order.customer_name}</span>
                  <span className="text-xs text-gray-400">{typeLabels[order.order_type]}</span>
                </div>
                <span className="font-semibold text-gray-600">{formatPrice(order.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [recipesByItem, setRecipesByItem] = useState({});
  const [menuAll, setMenuAll] = useState([]);
  const [customizationGroups, setCustomizationGroups] = useState([]);
  const [bigMode, setBigMode] = useState(false);
  const [view, setView] = useState('chef');
  const socket = useSocket();
  const audioRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const playNotification = () => {
    try {
      if (audioRef.current) audioRef.current.play();
    } catch {}
  };

  useEffect(() => {
    ordersApi.getKitchen().then(setOrders).catch(console.error);
    menuApi.getRecipes().then(setRecipesByItem).catch(console.error);
    menuApi.getAllAdmin().then(setMenuAll).catch(console.error);
    customizationsApi.getAll().then(setCustomizationGroups).catch(console.error);
    if (socket) {
      socket.emit('join:kitchen');
      socket.on('order:update', (order) => {
        if (['pendiente', 'preparando', 'listo'].includes(order.status)) {
          setOrders(prev => {
            const idx = prev.findIndex(o => o.id === order.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = order;
              return updated;
            }
            playNotification();
            return [...prev, order];
          });
        } else {
          setOrders(prev => prev.filter(o => o.id !== order.id));
        }
      });
    }
    return () => { if (socket) socket.off('order:update'); };
  }, [socket]);

  const updateStatus = (id, status) => ordersApi.updateStatus(id, status).catch(console.error);

  const variantGroupMap = useMemo(() => {
    const map = new Map();
    for (const group of customizationGroups) {
      for (const option of group.options || []) {
        map.set(option.name, option.grupo || option.name);
      }
    }
    return map;
  }, [customizationGroups]);

  const preparingOrders = orders.filter(o => o.status === 'preparando');

  const OrderCard = ({ order, compact }) => (
    <div className={`bg-white rounded-xl shadow-lg p-4 border-l-4 ${order.order_type === 'domicilio' ? 'border-l-blue-500' : 'border-l-green-500'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-bold">#{order.id}</span>
          <ElapsedTimer created={order.created_at} status={order.status} />
          <span className={`flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${order.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {order.order_type === 'domicilio' ? '🛵' : '🏠'} {typeLabels[order.order_type]}
          </span>
        </div>
        <span className="text-lg font-bold">{formatPrice(order.total)}</span>
      </div>
      <div className="text-lg font-medium mb-1">{order.customer_name}</div>
      {order.order_type === 'domicilio' && order.customer_address && (
        <div className="text-sm text-gray-500 mb-2">{order.customer_address}</div>
      )}
      <div className="space-y-1 mb-3">
        {order.items?.map(item => (
          <div key={item.id}>
            <div className="flex justify-between text-lg">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
            </div>
            <IngredientBreakdown item={item} recipesByItem={recipesByItem} />
          </div>
        ))}
      </div>
      {order.notes && <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded mb-2">📝 {order.notes}</div>}
      {!compact && (
        <div className="flex gap-2 mt-2">
          {order.status === 'pendiente' && <button onClick={() => updateStatus(order.id, 'preparando')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-lg font-semibold hover:bg-blue-600">Preparar</button>}
          {order.status === 'preparando' && <button onClick={() => updateStatus(order.id, 'listo')} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-lg font-semibold hover:bg-green-600">Terminar</button>}
          {order.status === 'pendiente' && <button onClick={() => updateStatus(order.id, 'cancelado')} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">Cancelar</button>}
        </div>
      )}
    </div>
  );

  const handleAdvance = (id, status) => updateStatus(id, status);
  const handleDeliver = (id) => ordersApi.updateStatus(id, 'completado').catch(console.error);

  const productionOrder = [...preparingOrders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;
  const sortByCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const localOrders = orders.filter(o => o.order_type === 'local').sort(sortByCreated);
  const deliveryOrders = orders.filter(o => o.order_type === 'domicilio').sort(sortByCreated);

  if (bigMode) {
    return (
      <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
        <button onClick={() => setBigMode(false)} className="fixed top-4 right-4 z-10 bg-ink-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-ink-800 transition">Salir Modo Botón</button>
        <BigButton orders={orders} onAdvance={handleAdvance} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+Af39/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f3+Af39/f4B/f3+AgH9/f3+AgH9/f3+AgH9/f3+AgH9/f38=" preload="auto"></audio>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-800">👨‍🍳 Cocina - La Gaonerita</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <button onClick={() => setView('chef')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${view === 'chef' ? 'bg-ink-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}>Chef</button>
            <button onClick={() => setView('tablero')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${view === 'tablero' ? 'bg-ink-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}>Tablero</button>
            <button onClick={() => setView('historial')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${view === 'historial' ? 'bg-ink-900 text-white' : 'text-gray-500 hover:text-gray-800'}`}>Historial</button>
          </div>
          <button onClick={() => setBigMode(true)} className="bg-ink-900 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm sm:text-lg font-bold hover:bg-ink-800 transition shadow-lg flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🔘</span> Botón Físico
          </button>
          {user?.role === 'admin' && (
            <>
              <Link to="/pending-bills" className="bg-green-600 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-sm sm:text-lg font-bold hover:bg-green-700 transition shadow-lg flex items-center gap-2">
                💰 Cuentas
              </Link>
              <button onClick={handleLogout} className="text-sm font-semibold uppercase tracking-widest border border-gray-300 text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition">Salir</button>
            </>
          )}
        </div>
      </div>
      {view === 'historial' ? (
        <HistorialActivas orders={orders} onDeliver={handleDeliver} />
      ) : view === 'chef' ? (
        <ChefBoard orders={orders} recipesByItem={recipesByItem} menuAll={menuAll} variantGroupMap={variantGroupMap} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-blue-700 bg-blue-100 p-3 rounded-t-lg text-center">En Producción</h2>
          {productionOrder ? (
            <div className="bg-white rounded-b-xl shadow-lg p-5 border-4 border-blue-400">
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl font-black text-ink-900">#{productionOrder.id}</span>
                <ElapsedTimer created={productionOrder.created_at} status={productionOrder.status} />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${productionOrder.order_type === 'domicilio' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {productionOrder.order_type === 'domicilio' ? '🛵' : '🏠'} {typeLabels[productionOrder.order_type]}
                </span>
                <span className="text-xl font-bold text-ink-900">{productionOrder.customer_name}</span>
              </div>
              {productionOrder.order_type === 'domicilio' && productionOrder.customer_address && (
                <div className="text-sm text-gray-500 mb-3">📍 {productionOrder.customer_address}</div>
              )}
              <div className="space-y-2 my-4">
                {productionOrder.items?.map(item => (
                  <div key={item.id}>
                    <div className="flex justify-between text-xl border-b border-gray-100 pb-1">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    <IngredientBreakdown item={item} recipesByItem={recipesByItem} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-200">
                <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">Total</span>
                <span className="text-2xl font-black text-ink-900">{formatPrice(productionOrder.total)}</span>
              </div>
              {productionOrder.notes && <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded mt-3">📝 {productionOrder.notes}</div>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => updateStatus(productionOrder.id, 'listo')} className="flex-1 bg-green-500 text-white py-3 rounded-xl text-lg font-bold hover:bg-green-600 transition shadow">✅ Terminar</button>
                <button onClick={() => updateStatus(productionOrder.id, 'cancelado')} className="bg-red-100 text-red-600 px-4 py-3 rounded-xl hover:bg-red-200">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-b-xl shadow-lg p-10 text-center text-gray-400">
              <div className="text-6xl mb-4">🍃</div>
              <p className="text-lg font-semibold">No hay órdenes en producción</p>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-green-700 bg-green-100 p-3 rounded-t-lg text-center">Local ({localOrders.length})</h2>
          <div className="space-y-3 mt-3">
            {localOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">Sin órdenes de local</div>
            ) : (
              localOrders.map(order => <OrderCard key={order.id} order={order} compact={false} />)
            )}
          </div>
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-blue-700 bg-blue-100 p-3 rounded-t-lg text-center">Domicilio ({deliveryOrders.length})</h2>
          <div className="space-y-3 mt-3">
            {deliveryOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">Sin órdenes de domicilio</div>
            ) : (
              deliveryOrders.map(order => <OrderCard key={order.id} order={order} compact={false} />)
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
