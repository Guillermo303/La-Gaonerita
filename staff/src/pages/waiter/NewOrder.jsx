import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { menu as menuApi, orders as ordersApi } from '../../api';
import { formatPrice } from '../../lib/utils';
import MesaSelector from '../../components/MesaSelector';

export default function NewOrder() {
  const [searchParams] = useSearchParams();
  const [menuData, setMenuData] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', type: 'local', notes: '' });
  const [mesa, setMesa] = useState(searchParams.get('mesa') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => { menuApi.getAll().then(setMenuData).catch(console.error); }, []);

  const addItem = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.menu_item_id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name || cart.length === 0) { setError('Nombre y al menos un producto requerido'); return; }
    setLoading(true);
    setError('');
    try {
      const order = await ordersApi.create({
        customer_name: customer.name,
        customer_phone: customer.phone || null,
        customer_address: customer.type === 'domicilio' ? customer.address : null,
        mesa: customer.type === 'local' ? mesa : null,
        order_type: customer.type,
        notes: customer.notes || null,
        payment_method: 'efectivo',
        items: cart.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: null }))
      });
      navigate('/waiter');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 pb-20 lg:pb-0">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/waiter')} className="text-ink-400 hover:text-ink-600 text-lg">←</button>
          <h1 className="text-2xl font-bold">Nueva Orden</h1>
          {mesa && <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{mesa}</span>}
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-md space-y-3">
          <div>
            <label className="block text-sm font-medium">Cliente</label>
            <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="w-full mt-1 p-2 border rounded" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium">Teléfono</label>
              <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="w-full mt-1 p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Tipo</label>
              <select value={customer.type} onChange={e => {
                setCustomer({ ...customer, type: e.target.value });
                if (e.target.value !== 'local') setMesa('');
              }} className="w-full mt-1 p-2 border rounded">
                <option value="local">Local</option>
                <option value="domicilio">Domicilio</option>
              </select>
            </div>
          </div>
          {customer.type === 'local' && (
            <div className="pt-1">
              <MesaSelector selected={mesa} onSelect={setMesa} showLabel={true} />
            </div>
          )}
          {customer.type === 'domicilio' && (
            <div>
              <label className="block text-sm font-medium">Dirección</label>
              <textarea value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} className="w-full mt-1 p-2 border rounded" rows="2" required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">Notas</label>
            <textarea value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} className="w-full mt-1 p-2 border rounded" rows="2" />
          </div>
        </form>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-3">Menú</h2>
          {menuData.map(cat => (
            <div key={cat.id} className="mb-4">
              <h3 className="font-bold text-brand-700 mb-2">{cat.name}</h3>
              <div className="grid grid-cols-2 gap-2">
{cat.items.map(item => (
                    <button key={item.id} onClick={() => addItem(item)} className="bg-white p-3 rounded-lg shadow text-left hover:bg-brand-50 transition card-glow">
                      {item.image && (
                        <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-cream-100">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="font-medium">{item.name}</div>
                      <div className="text-brand-600 text-sm">{formatPrice(item.price)}</div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div id="cart-section" className="bg-white p-4 rounded-xl shadow-md lg:sticky lg:top-20 scroll-mt-20">
          <h2 className="text-xl font-bold mb-4">Carrito</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Selecciona productos del menú</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.menu_item_id} className="flex justify-between items-center py-2 border-b gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-sm text-gray-600">{formatPrice(item.price)} c/u</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQty(item.menu_item_id, -1)} className="w-9 h-9 bg-gray-100 rounded-full font-bold">-</button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menu_item_id, 1)} className="w-9 h-9 bg-gray-100 rounded-full font-bold">+</button>
                    <span className="w-20 text-right font-bold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button onClick={handleSubmit} disabled={loading} className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-50">
                {loading ? 'Creando...' : 'Crear Orden'}
              </button>
            </>
          )}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white border-t border-ink-100 shadow-2xl flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-ink-400 font-semibold uppercase tracking-wider">{cart.reduce((n, i) => n + i.quantity, 0)} producto{cart.reduce((n, i) => n + i.quantity, 0) !== 1 ? 's' : ''}</div>
            <div className="font-black text-lg text-ink-900">{formatPrice(total)}</div>
          </div>
          <button onClick={() => document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-500 text-white px-5 py-3 rounded-lg font-bold text-sm hover:bg-brand-600 transition">Ver Carrito →</button>
        </div>
      )}
    </div>
  );
}
