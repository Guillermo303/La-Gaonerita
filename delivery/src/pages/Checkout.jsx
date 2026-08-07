import { useState, useEffect } from 'react';
import { orders as ordersApi, verification as verificationApi } from '../api';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { findCustomerByName, saveCustomer } from '../lib/customers';
import { isVerified, saveVerification, getToken } from '../lib/phoneVerification';

const DELIVERY_FEE = 15;

export default function Checkout({ onPrev, onGoToMenu, onPlaced }) {
  const { items, updateQty, clear, count, total, orderType, orderTime, customizations } = useCart();
  const tortillaGroup = Object.keys(customizations).find(k => k.toLowerCase().includes('tortilla'));
  const tortillaType = tortillaGroup ? customizations[tortillaGroup] : null;
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', payment: 'efectivo' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [suggested, setSuggested] = useState(null);
  const [appliedFor, setAppliedFor] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpStep, setOtpStep] = useState('idle'); // idle | sent
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    setOtpVerified(isVerified(form.phone));
    setOtpStep('idle');
    setOtpCode('');
    setOtpError('');
  }, [form.phone]);

  const handleSendOtp = async () => {
    setOtpError('');
    if (!form.phone.trim()) { setOtpError('Escribe tu teléfono primero'); return; }
    setOtpBusy(true);
    try {
      await verificationApi.send(form.phone.trim());
      setOtpStep('sent');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (!otpCode.trim()) { setOtpError('Escribe el código que te enviamos'); return; }
    setOtpBusy(true);
    try {
      const res = await verificationApi.check(form.phone.trim(), otpCode.trim());
      saveVerification(form.phone.trim(), res.token);
      setOtpVerified(true);
      setOtpStep('idle');
      setOtpCode('');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpBusy(false);
    }
  };

  const deliveryFee = orderType === 'domicilio' ? DELIVERY_FEE : 0;
  const finalTotal = total + deliveryFee;

  const handleNameChange = (value) => {
    setForm({ ...form, name: value });
    const match = value.trim() ? findCustomerByName(value) : null;
    const alreadyApplied = match && normalizeForCompare(match.name) === normalizeForCompare(appliedFor);
    setSuggested(match && !alreadyApplied ? match : null);
  };

  const applySuggestion = () => {
    if (!suggested) return;
    setForm(prev => ({
      ...prev,
      phone: suggested.phone || prev.phone,
      address: suggested.address || prev.address,
    }));
    setAppliedFor(suggested.name);
    setSuggested(null);
  };

  const dismissSuggestion = () => {
    setAppliedFor(form.name);
    setSuggested(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Escribe tu nombre'); return; }
    if (!form.phone.trim()) { setError('Escribe un teléfono para contactarte'); return; }
    if (!otpVerified) { setError('Verifica tu número de teléfono antes de continuar'); return; }
    if (orderType === 'domicilio' && !form.address.trim()) { setError('Escribe la dirección de entrega'); return; }
    setPlacing(true);
    try {
      const timeNote = orderTime ? `Horario: ${orderTime}` : null;
      const notes = [timeNote, form.notes.trim()].filter(Boolean).join(' — ') || null;
      const orderItems = items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, notes: i.variant || null }));
      if (deliveryFee > 0) {
        orderItems.push({ name: 'Costo de entrega', price: DELIVERY_FEE, quantity: 1 });
      }
      const order = await ordersApi.create({
        customer_name: form.name.trim(),
        customer_phone: form.phone.trim(),
        customer_address: orderType === 'local' ? 'Recoge en local' : form.address.trim(),
        order_type: orderType || 'domicilio',
        notes,
        payment_method: form.payment,
        items: orderItems,
        phone_verification_token: getToken(),
      });
      saveCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: orderType === 'local' ? '' : form.address.trim(),
      });
      clear();
      onPlaced(order, tortillaType);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  function normalizeForCompare(name) {
    return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  if (count === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="pop-in text-5xl mb-4">🛒</div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 mb-3">Tu carrito está vacío</h1>
        <p className="text-ink-500 mb-8">Ve al menú y elige tus platillos favoritos.</p>
        <button onClick={onGoToMenu} className="btn-grow inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600">← Volver al Menú</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] text-center mb-1">PASO 5 DE 6</p>
      <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-ink-900 text-center mb-2">Confirmar Pedido</h1>

      <div className="max-w-2xl mx-auto mb-8 flex items-center justify-center gap-6 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink-600">
          {orderType === 'local' ? '🏪 Recoger en local' : '🛵 Entregar a domicilio'}
        </span>
        {orderTime && (
          <>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1.5 font-semibold text-ink-600">
              🕐 {orderTime === 'lo antes posible' ? 'Lo antes posible' : orderTime}
            </span>
          </>
        )}
      </div>

      {error && <div className="bg-brand-50 border border-brand-200 text-brand-700 p-3 rounded-lg mb-6 max-w-2xl mx-auto">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="font-display text-xl font-bold text-ink-900 mb-4">Productos ({count})</h2>
            {items.map(item => (
              <div key={`${item.menu_item_id}-${item.variant || ''}`} className="flex items-center justify-between py-3 border-b border-cream-200 last:border-0">
                <div className="min-w-0">
                  <div className="font-semibold text-ink-800 truncate">{item.name}</div>
                  <div className="text-sm text-ink-400">{formatPrice(item.price)} c/u</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateQty(item.menu_item_id, -1, item.variant)} aria-label={`Quitar un ${item.name}`} className="w-8 h-8 rounded-full bg-cream-100 text-ink-700 font-bold hover:bg-cream-200 transition">−</button>
                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.menu_item_id, 1, item.variant)} aria-label={`Agregar otro ${item.name}`} className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold hover:bg-brand-600 transition">+</button>
                  <span className="w-20 text-right font-bold text-ink-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-4 text-lg">
              <span className="font-bold text-ink-900">Subtotal</span>
              <span className="font-bold text-ink-900">{formatPrice(total)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-ink-500">Costo de entrega</span>
                <span className="text-ink-500">+ {formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-cream-200">
              <span className="font-bold text-ink-900 text-lg">Total</span>
              <span className="font-extrabold text-brand-600 text-xl">{formatPrice(finalTotal)}</span>
            </div>
            <button onClick={onGoToMenu} className="block w-full text-center text-sm text-brand-600 font-semibold hover:underline mt-3">+ Agregar más productos</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Tu nombre</label>
              <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)}
                className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Nombre y apellido" />
            </div>

            {suggested && orderType === 'domicilio' && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                <p className="text-sm font-bold text-ink-900 mb-2">¿Este es tu número/dirección?</p>
                {suggested.phone && <p className="text-sm text-ink-600">📞 {suggested.phone}</p>}
                {suggested.address && <p className="text-sm text-ink-600 mt-0.5">📍 {suggested.address}</p>}
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={applySuggestion} className="flex-1 bg-brand-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-brand-600 transition">
                    Sí, usar
                  </button>
                  <button type="button" onClick={dismissSuggestion} className="flex-1 bg-white border border-ink-200 text-ink-600 py-2 rounded-lg font-bold text-sm hover:bg-cream-50 transition">
                    No
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Teléfono</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="55 1234 5678" />
              {form.phone.trim() && (
                otpVerified ? (
                  <p className="text-xs font-semibold text-green-600 mt-2">✓ Número verificado</p>
                ) : (
                  <div className="bg-cream-50 border border-ink-200 rounded-xl p-3 mt-2">
                    {otpStep === 'idle' ? (
                      <button type="button" onClick={handleSendOtp} disabled={otpBusy}
                        className="text-sm font-bold text-brand-600 hover:underline disabled:opacity-50">
                        {otpBusy ? 'Enviando…' : '📲 Verificar este número'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-ink-500">Te enviamos un código por SMS a {form.phone}</p>
                        <div className="flex gap-2">
                          <input type="text" inputMode="numeric" value={otpCode} onChange={e => setOtpCode(e.target.value)}
                            placeholder="Código de 6 dígitos" maxLength={6}
                            className="flex-1 p-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                          <button type="button" onClick={handleVerifyOtp} disabled={otpBusy}
                            className="px-4 py-2 bg-brand-500 text-white rounded-lg font-bold text-sm hover:bg-brand-600 disabled:opacity-50">
                            {otpBusy ? '…' : 'Confirmar'}
                          </button>
                        </div>
                        <button type="button" onClick={handleSendOtp} disabled={otpBusy} className="text-xs text-ink-400 hover:underline">
                          Reenviar código
                        </button>
                      </div>
                    )}
                    {otpError && <p className="text-xs text-brand-600 mt-1">{otpError}</p>}
                  </div>
                )
              )}
            </div>

            {orderType === 'domicilio' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">Dirección de entrega</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows="2"
                  className="w-full p-2.5 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Calle, número, colonia y referencias" />
              </div>
            )}
            {orderType === 'local' && (
              <div className="bg-cream-50 border border-brand-200 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-brand-700">🏪 Recoges en el local</p>
                <p className="text-xs text-ink-500 mt-1">Te esperamos en la dirección del local para entregarte tu pedido.</p>
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
                <option value="efectivo">Efectivo al recibir</option>
                <option value="tarjeta">Tarjeta al recibir</option>
                <option value="transferencia">Transferencia (Mercado Pago)</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onPrev} className="flex-1 px-6 py-3.5 rounded-lg font-bold border border-ink-200 text-ink-600 hover:bg-cream-50 transition">
                ← Atrás
              </button>
              <button type="submit" disabled={placing}
                className="flex-1 btn-grow bg-brand-500 text-white py-3.5 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-brand-600 disabled:opacity-50 disabled:hover:transform-none">
                {placing ? 'Enviando pedido…' : `Confirmar Pedido · ${formatPrice(finalTotal)}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
