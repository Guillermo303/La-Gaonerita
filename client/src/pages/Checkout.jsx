import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orders as ordersApi } from '../api';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { items, updateQty, clear, count, total } = useCart();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ phone: '', address: '', type: 'domicilio', notes: '', payment: 'efectivo' });
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.phone) setForm(f => ({ ...f, phone: f.phone || user.phone }));
  }, [user]);

  const quickEligible = items.length > 0 && items.every(i => i.ready_to_serve);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.type === 'domicilio' && !form.address.trim()) { setError('Escribe la dirección de entrega'); return; }
    if (form.type === 'domicilio' && !form.phone.trim()) { setError('Escribe un teléfono para contactarte'); return; }
    setPlacing(true);
    try {
      const order = await ordersApi.create({
        customer_name: user.name,
        customer_phone: form.phone.trim() || null,
        customer_address: form.type === 'domicilio' ? form.address.trim() : null,
        order_type: form.type,
        notes: form.notes.trim() || null,
        payment_method: form.payment,
        quick_sale: quickEligible,
        items: items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity }))
      });
      clear();
      setPlaced(order);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="text-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div></div>;

  if (placed) {
    const yaListo = placed.status === 'completado';
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">{yaListo ? '⚡' : '✅'}</div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">{yaListo ? '¡Ya está listo!' : '¡Pedido recibido!'}</h1>
        <p className="text-ink-500 mb-2">
          {yaListo
            ? <>Tu orden <span className="font-bold text-brand-600">#{placed.id}</span> no requiere preparación, ya puedes pasar por ella.</>
            : <>Tu orden <span className="font-bold text-brand-600">#{placed.id}</span> ya está en la cocina.</>}
        </p>
        <p className="text-ink-400 text-sm mb-8">
          {yaListo
            ? (placed.order_type === 'domicilio' ? 'Sale a tu dirección de inmediato.' : 'Pasa a recogerlo y pagarlo en sucursal cuando quieras.')
            : (placed.order_type === 'domicilio'
              ? 'Te lo llevamos a tu dirección en cuanto esté listo.'
              : 'Te avisamos en sucursal cuando esté listo.')}
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/my-orders" className="bg-brand-500 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Seguir mi pedido</Link>
          <Link to="/menu" className="border border-ink-200 text-ink-600 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-cream-100 transition">Volver al menú</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🌮</div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">Casi listo…</h1>
        <p className="text-ink-500 mb-8">Para hacer tu pedido necesitas una cuenta. Tu carrito se guarda mientras tanto.</p>
        <div className="flex flex-col gap-3">
          <Link to="/join" className="bg-brand-500 text-white py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Crear Cuenta</Link>
          <Link to="/login" className="border border-ink-200 text-ink-600 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-cream-100 transition">Ya tengo cuenta</Link>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">Tu carrito está vacío</h1>
        <p className="text-ink-500 mb-8">Ve al menú y elige tus platillos favoritos.</p>
        <Link to="/menu" className="inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition">Ver Menú</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900 text-center mb-10">Tu Pedido</h1>
      {error && <div className="bg-brand-50 border border-brand-200 text-brand-700 p-3 rounded-lg mb-6 max-w-2xl mx-auto">{error}</div>}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Carrito */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="font-display text-xl font-bold text-ink-900 mb-4">Productos ({count})</h2>
            {quickEligible && (
              <div className="bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold rounded-lg p-3 mb-4">⚡ Estos productos no requieren preparación — tu pedido estará listo al instante.</div>
            )}
            {items.map(item => (
              <div key={item.menu_item_id} className="flex items-center justify-between py-3 border-b border-cream-200 last:border-0">
                <div className="min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{item.name}</div>
                  <div className="text-sm text-ink-400">{formatPrice(item.price)} c/u</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateQty(item.menu_item_id, -1)} aria-label={`Quitar un ${item.name}`} className="w-8 h-8 rounded-full bg-cream-100 text-ink-700 font-bold hover:bg-cream-200 transition">−</button>
                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.menu_item_id, 1)} aria-label={`Agregar otro ${item.name}`} className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold hover:bg-brand-600 transition">+</button>
                  <span className="w-20 text-right font-bold text-ink-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-4 text-lg">
              <span className="font-bold text-ink-900">Total</span>
              <span className="font-extrabold text-brand-600 text-xl">{formatPrice(total)}</span>
            </div>
            <Link to="/menu" className="block text-center text-sm text-brand-600 font-semibold hover:underline mt-3">+ Agregar más productos</Link>
          </div>
        </div>

        {/* Datos de entrega */}
        <form onSubmit={handleSubmit} className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-3">¿Cómo quieres tu pedido?</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({ ...form, type: 'domicilio' })}
                  className={`rounded-xl border-2 p-4 text-center transition ${form.type === 'domicilio' ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-200'}`}>
                  <div className="text-3xl mb-1">🛵</div>
                  <div className="font-bold text-ink-900">A Domicilio</div>
                  <div className="text-xs text-ink-400">Te lo llevamos</div>
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: 'local' })}
                  className={`rounded-xl border-2 p-4 text-center transition ${form.type === 'local' ? 'border-brand-500 bg-brand-50' : 'border-ink-100 hover:border-ink-200'}`}>
                  <div className="text-3xl mb-1">🏠</div>
                  <div className="font-bold text-ink-900">En Sucursal</div>
                  <div className="text-xs text-ink-400">Pasas por él</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Teléfono {form.type === 'local' && <span className="normal-case font-normal text-ink-300">(opcional)</span>}</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="55 1234 5678" />
            </div>

            {form.type === 'domicilio' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Dirección de entrega</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows="2"
                  className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Calle, número, colonia y referencias" />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Notas para la cocina <span className="normal-case font-normal text-ink-300">(opcional)</span></label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2"
                className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Sin cebolla, salsa aparte…" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Forma de pago</label>
              <select value={form.payment} onChange={e => setForm({ ...form, payment: e.target.value })}
                className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                <option value="efectivo">Efectivo {form.type === 'domicilio' ? 'al recibir' : 'en sucursal'}</option>
                <option value="tarjeta">Tarjeta {form.type === 'domicilio' ? 'al recibir' : 'en sucursal'}</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            <button type="submit" disabled={placing}
              className="w-full bg-brand-500 text-white py-3.5 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 transition disabled:opacity-50">
              {placing ? 'Enviando pedido…' : `Confirmar Pedido · ${formatPrice(total)}`}
            </button>
            <p className="text-xs text-ink-400 text-center">Pedido a nombre de <span className="font-semibold">{user.name}</span></p>
          </div>
        </form>
      </div>
    </div>
  );
}
