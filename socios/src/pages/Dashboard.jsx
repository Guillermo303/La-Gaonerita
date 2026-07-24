import { useState, useEffect } from 'react';
import { reports as reportsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../lib/utils';
import { printSalesReport, downloadSalesCSV } from '../lib/reportPrint';
import GrowthLottie from '../components/GrowthLottie';
import CountUp from '../components/CountUp';

function fmtHour(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

const periodLabels = { day: 'Día', week: 'Semana', month: 'Mes' };

function SavedReports() {
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
                <div className="text-sm text-ink-500 mt-0.5">{formatPrice(r.total_revenue)} · {r.order_count} órdenes</div>
              </div>
              <button onClick={() => ver(r.id)} className="text-xs bg-ink-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-ink-900">🖨️ Ver / Imprimir</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('actual');
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    reportsApi.getHealth(period, date).then(setHealth).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [period, date]);

  const maxHourly = health ? Math.max(1, ...health.hourly.map(h => h.orders)) : 1;
  const maxProduct = health && health.topProducts.length ? Math.max(...health.topProducts.map(p => p.quantity)) : 1;

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-ink-900 text-cream-50 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black font-display">🌮 La Gaonerita · Socios</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-cream-100/80">{user?.name}</span>
            <button onClick={logout} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg font-bold hover:bg-white/20">Salir</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-1 bg-ink-100 rounded-lg p-1 mb-6 w-fit">
          {[['actual', 'Salud del Negocio'], ['guardados', 'Reportes Guardados']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${view === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
          ))}
        </div>

        {view === 'guardados' ? <SavedReports /> : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div className="flex gap-1 bg-ink-100 rounded-lg p-1">
                {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([key, label]) => (
                  <button key={key} onClick={() => setPeriod(key)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${period === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}>{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-ink-200 rounded-lg p-2 text-sm bg-white" />
                {health && (
                  <>
                    <button onClick={() => printSalesReport(health, period, date)} className="text-xs bg-ink-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-ink-900">🖨️ PDF</button>
                    <button onClick={() => downloadSalesCSV(health, period, date)} className="text-xs bg-cream-100 text-ink-700 px-3 py-2 rounded-lg font-bold hover:bg-cream-200">⬇️ CSV</button>
                  </>
                )}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            {loading || !health ? (
              <div className="text-center py-12 text-ink-400">Cargando...</div>
            ) : (
              <div className="space-y-6">
                <div className="relative bg-gradient-to-br from-ink-900 to-ink-800 rounded-2xl overflow-hidden p-6">
                  <GrowthLottie positive={health.profitEstimate >= 0} className="absolute inset-0 opacity-60" />
                  <div className="relative">
                    <div className="text-cream-100/70 text-xs font-bold uppercase tracking-widest mb-1">Ingresos · {periodLabels[period]}</div>
                    <div className="text-4xl font-black text-white"><CountUp value={health.totalRevenue} format={formatPrice} /></div>
                    <div className={`text-sm font-bold mt-1 ${health.profitEstimate >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {health.profitEstimate >= 0 ? '📈 Utilidad positiva' : '📉 Utilidad negativa'} este periodo
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
                    <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Ingresos</div>
                    <div className="text-xl font-black text-brand-600 mt-1">{formatPrice(health.totalRevenue)}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
                    <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Órdenes</div>
                    <div className="text-xl font-black text-ink-900 mt-1">{health.orderCount}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
                    <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Ticket Prom.</div>
                    <div className="text-xl font-black text-ink-900 mt-1">{formatPrice(health.avgTicket)}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
                    <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Nómina Est.</div>
                    <div className="text-xl font-black text-ink-900 mt-1">{formatPrice(health.payrollEstimate)}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-ink-100">
                    <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Gastos</div>
                    <div className="text-xl font-black text-ink-900 mt-1">{formatPrice(health.expensesTotal)}</div>
                  </div>
                  <div className={`rounded-xl p-4 shadow-sm border ${health.profitEstimate >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-xs text-ink-400 font-medium uppercase tracking-wider">Utilidad Est.</div>
                    <div className={`text-xl font-black mt-1 ${health.profitEstimate >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatPrice(health.profitEstimate)}</div>
                  </div>
                </div>
                <p className="text-xs text-ink-400 italic -mt-3">{health.estimateNote} · {health.activeEmployees} empleado(s) activo(s) considerado(s).</p>

                {health.expensesByCategory.length > 0 && (
                  <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
                    <h3 className="font-bold text-ink-900 mb-3">Gastos por categoría</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {health.expensesByCategory.map(c => (
                        <div key={c.category} className="bg-cream-50 rounded-lg p-3">
                          <div className="text-xs text-ink-400 uppercase font-semibold">{c.category}</div>
                          <div className="font-black text-ink-900">{formatPrice(c.total)}</div>
                          <div className="text-xs text-ink-400">{c.count} registro(s)</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {health.peakHour ? (
                  <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-brand-800 text-sm font-semibold">
                    🕐 La hora con más ventas fue las <span className="font-black">{fmtHour(health.peakHour.hour)}</span>, con {health.peakHour.orders} órdenes y {formatPrice(health.peakHour.revenue)}.
                  </div>
                ) : (
                  <div className="bg-ink-50 border border-ink-200 rounded-xl p-4 text-ink-500 text-sm">Sin ventas registradas en este periodo.</div>
                )}

                <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
                  <h3 className="font-bold text-ink-900 mb-3">Productos más vendidos</h3>
                  {health.topProducts.length === 0 ? (
                    <div className="text-center py-6 text-ink-400 text-sm">Sin ventas en este periodo</div>
                  ) : (
                    <div className="space-y-2">
                      {health.topProducts.map(p => (
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
                    {health.hourly.map(h => (
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

                {health.daily.length > 0 && (
                  <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
                    <h3 className="font-bold text-ink-900 mb-3">Ventas por día</h3>
                    <div className="space-y-1">
                      {health.daily.map(d => (
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
                    {health.paymentBreakdown.length === 0 ? (
                      <div className="text-center py-2 text-ink-400 text-sm sm:col-span-3">Sin ventas en este periodo</div>
                    ) : health.paymentBreakdown.map(p => (
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
    </div>
  );
}
