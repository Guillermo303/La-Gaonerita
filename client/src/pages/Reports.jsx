import { useState, useEffect } from 'react';
import { pos as posApi } from '../api';
import { formatPrice } from '../lib/utils';
import { exportCSV, formatDate, formatCurrency } from '../lib/exportCSV';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [daily, setDaily] = useState([]);
  const [period, setPeriod] = useState('today');

  const getDates = () => {
    const now = new Date();
    if (period === 'today') {
      const d = now.toISOString().slice(0, 10);
      return { start: `${d} 00:00:00`, end: `${d} 23:59:59` };
    }
    if (period === 'week') {
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      return { start: `${start} 00:00:00`, end: `${end} 23:59:59` };
    }
    if (period === 'month') {
      const end = now.toISOString().slice(0, 10);
      const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      return { start: `${start} 00:00:00`, end: `${end} 23:59:59` };
    }
    return {};
  };

  useEffect(() => {
    const d = getDates();
    posApi.getSalesReport(d).then(setReport).catch(console.error);
    posApi.getDailyReport(7).then(setDaily).catch(console.error);
  }, [period]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black font-display text-ink-900">📊 Reportes de Ventas</h1>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white">
            <option value="today">Hoy</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Últimos 30 días</option>
          </select>
          <div className="relative group">
            <button className="border border-ink-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-ink-50 transition">⬇ Exportar</button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-ink-200 rounded-xl shadow-lg z-20 hidden group-hover:block min-w-[180px]">
              <button onClick={() => report?.topItems && exportCSV(report.topItems.map(i => ({ Producto: i.name, Cantidad: i.qty, Total: formatCurrency(i.total) })), 'mas_vendidos_' + period)} className="w-full text-left px-4 py-2 text-sm hover:bg-cream-50 transition">Más vendidos</button>
              <button onClick={() => report?.byPayment && exportCSV(report.byPayment.map(p => ({ Metodo: p.payment_method, Ventas: p.count, Total: formatCurrency(p.total) })), 'por_metodo_' + period)} className="w-full text-left px-4 py-2 text-sm hover:bg-cream-50 transition">Por método de pago</button>
              <button onClick={() => report?.byType && exportCSV(report.byType.map(t => ({ Tipo: t.order_type, Ordenes: t.count, Total: formatCurrency(t.total) })), 'por_tipo_' + period)} className="w-full text-left px-4 py-2 text-sm hover:bg-cream-50 transition">Por tipo de orden</button>
              <button onClick={() => daily.length && exportCSV(daily.map(d => ({ Fecha: formatDate(d.date), Ordenes: d.orders, Total: formatCurrency(d.total) })), 'diario_7dias')} className="w-full text-left px-4 py-2 text-sm hover:bg-cream-50 transition">Últimos 7 días</button>
              <hr className="border-ink-100 my-1" />
              <button onClick={() => {
                const rows = [];
                report?.topItems?.forEach(i => rows.push({ Tipo: 'Más vendido', Producto: i.name, Cantidad: i.qty, Total: formatCurrency(i.total) }));
                report?.byPayment?.forEach(p => rows.push({ Tipo: 'Por método', Metodo: p.payment_method, Ventas: p.count, Total: formatCurrency(p.total) }));
                report?.byType?.forEach(t => rows.push({ Tipo: 'Por tipo', Orden: t.order_type, Cantidad: t.count, Total: formatCurrency(t.total) }));
                daily?.forEach(d => rows.push({ Tipo: 'Diario', Fecha: formatDate(d.date), Cantidad: d.orders, Total: formatCurrency(d.total) }));
                exportCSV(rows, 'reporte_completo_' + period);
              }} className="w-full text-left px-4 py-2 text-sm font-bold text-brand-600 hover:bg-cream-50 transition">Reporte completo</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
          <div className="text-2xl font-black text-ink-900">{report?.total?.count || 0}</div>
          <div className="text-xs text-ink-400 font-medium uppercase tracking-wider mt-1">Ventas</div>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 shadow-sm border border-brand-200">
          <div className="text-2xl font-black text-brand-700">{report ? formatPrice(report.total.total) : '$0'}</div>
          <div className="text-xs text-brand-600 font-medium uppercase tracking-wider mt-1">Total cobrado</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
          <div className="text-2xl font-black text-ink-900">{report?.total?.count ? formatPrice(report.total.total / report.total.count) : '$0'}</div>
          <div className="text-xs text-ink-400 font-medium uppercase tracking-wider mt-1">Ticket promedio</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
          <div className="text-lg font-black text-ink-900">{report?.lowStock?.length || 0}</div>
          <div className="text-xs text-ink-400 font-medium uppercase tracking-wider mt-1">Stock bajo</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-500 mb-3">Por método de pago</h2>
          <div className="space-y-2">
            {report?.byPayment?.map(p => (
              <div key={p.payment_method} className="flex justify-between items-center">
                <span className="text-sm font-medium text-ink-700">{p.payment_method === 'efectivo' ? '💵 Efectivo' : p.payment_method === 'tarjeta' ? '💳 Tarjeta' : '🏦 Transferencia'}</span>
                <div className="text-right">
                  <div className="font-bold text-ink-900">{formatPrice(p.total)}</div>
                  <div className="text-xs text-ink-400">{p.count} vent{(p.count !== 1) ? 'as' : 'a'}</div>
                </div>
              </div>
            ))}
            {(!report?.byPayment || report.byPayment.length === 0) && <p className="text-xs text-ink-300 text-center py-4">Sin datos</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-500 mb-3">Por tipo de orden</h2>
          <div className="space-y-2">
            {report?.byType?.map(t => (
              <div key={t.order_type} className="flex justify-between items-center">
                <span className="text-sm font-medium text-ink-700">{t.order_type === 'local' ? '🏠 Local' : '🛵 Domicilio'}</span>
                <div className="text-right">
                  <div className="font-bold text-ink-900">{formatPrice(t.total)}</div>
                  <div className="text-xs text-ink-400">{t.count} órdenes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-ink-100 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-ink-500 mb-3">🔥 Platillos más vendidos</h2>
        <div className="space-y-2">
          {report?.topItems?.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-bold text-ink-300">#{i + 1}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink-900">{item.name}</div>
                <div className="text-xs text-ink-400">{item.qty} vendidos</div>
              </div>
              <span className="font-bold text-ink-900">{formatPrice(item.total)}</span>
            </div>
          ))}
          {(!report?.topItems || report.topItems.length === 0) && <p className="text-xs text-ink-300 text-center py-4">Sin ventas en este periodo</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-ink-100">
        <h2 className="text-sm font-bold uppercase tracking-widest text-ink-500 mb-3">📅 Últimos 7 días</h2>
        <div className="space-y-1">
          {daily.map(d => (
            <div key={d.date} className="flex items-center gap-3">
              <span className="w-24 text-xs text-ink-500">{new Date(d.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <div className="flex-1 h-6 bg-cream-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, (d.total / (Math.max(...daily.map(x => x.total), 1))) * 100)}%` }} />
              </div>
              <span className="w-20 text-right text-sm font-bold text-ink-700">{formatPrice(d.total)}</span>
              <span className="w-10 text-right text-xs text-ink-400">{d.orders}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
