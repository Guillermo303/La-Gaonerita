import { query, get, run } from './db.js';

function parseDate(sqlTimestamp) {
  return new Date(sqlTimestamp + 'Z');
}

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

export function computeRange(period, anchor) {
  if (period === 'day') return [startOfDay(anchor), endOfDay(anchor)];
  if (period === 'week') return [startOfWeek(anchor), endOfWeek(anchor)];
  if (period === 'month') return [startOfMonth(anchor), endOfMonth(anchor)];
  return null;
}

function toSql(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function buildSalesReport(period, anchor) {
  const rangeResult = computeRange(period, anchor);
  if (!rangeResult) return null;
  const [start, end] = rangeResult;

  const bufferStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const bufferEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const candidates = query(
    "SELECT * FROM orders WHERE payment_status = 'pagado' AND created_at >= ? AND created_at <= ? ORDER BY created_at",
    [toSql(bufferStart), toSql(bufferEnd)]
  );

  const inRange = candidates.filter(o => {
    const t = parseDate(o.created_at).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const orderIds = inRange.map(o => o.id);
  let items = [];
  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    items = query(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds);
  }

  const totalRevenue = inRange.reduce((s, o) => s + o.total, 0);
  const orderCount = inRange.length;
  const avgTicket = orderCount ? totalRevenue / orderCount : 0;

  const productMap = new Map();
  for (const it of items) {
    const cur = productMap.get(it.name) || { name: it.name, quantity: 0, revenue: 0 };
    cur.quantity += it.quantity;
    cur.revenue += it.price * it.quantity;
    productMap.set(it.name, cur);
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0 }));
  for (const o of inRange) {
    const h = parseDate(o.created_at).getHours();
    hourly[h].orders += 1;
    hourly[h].revenue += o.total;
  }
  const peakHour = hourly.reduce((max, h) => (h.orders > max.orders ? h : max), hourly[0]);

  const dailyMap = new Map();
  for (const o of inRange) {
    const key = parseDate(o.created_at).toLocaleDateString('en-CA');
    const cur = dailyMap.get(key) || { date: key, revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    dailyMap.set(key, cur);
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const paymentMap = new Map();
  for (const o of inRange) {
    const key = o.payment_method || 'efectivo';
    const cur = paymentMap.get(key) || { method: key, revenue: 0, count: 0 };
    cur.revenue += o.total;
    cur.count += 1;
    paymentMap.set(key, cur);
  }
  const paymentBreakdown = [...paymentMap.values()];

  return {
    period,
    range: { start: start.toISOString(), end: end.toISOString() },
    totalRevenue,
    orderCount,
    avgTicket,
    topProducts,
    hourly,
    peakHour: peakHour.orders > 0 ? peakHour : null,
    daily,
    paymentBreakdown
  };
}

const DAILY_DIVISOR = { semanal: 7, quincenal: 15, mensual: 30 };

export function buildBusinessHealth(period, anchor) {
  const report = buildSalesReport(period, anchor);
  if (!report) return null;

  const employees = query(
    "SELECT d.salario, d.periodo_pago FROM employee_details d JOIN users u ON u.id = d.user_id WHERE u.active = 1 AND u.role NOT IN ('cliente', 'socio')"
  );

  const rangeStart = new Date(report.range.start);
  const rangeEnd = new Date(report.range.end);
  const days = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000)));

  const dailyPayroll = employees.reduce((sum, e) => sum + (e.salario || 0) / (DAILY_DIVISOR[e.periodo_pago] || 7), 0);
  const payrollEstimate = dailyPayroll * days;

  const startStr = rangeStart.toLocaleDateString('en-CA');
  const endStr = rangeEnd.toLocaleDateString('en-CA');
  const expenseRows = query('SELECT * FROM expenses WHERE date >= ? AND date <= ?', [startStr, endStr]);
  const expensesTotal = expenseRows.reduce((s, e) => s + e.amount, 0);

  const expensesByCategoryMap = new Map();
  for (const e of expenseRows) {
    const cur = expensesByCategoryMap.get(e.category) || { category: e.category, total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    expensesByCategoryMap.set(e.category, cur);
  }
  const expensesByCategory = [...expensesByCategoryMap.values()].sort((a, b) => b.total - a.total);

  const profitEstimate = report.totalRevenue - payrollEstimate - expensesTotal;

  return {
    ...report,
    activeEmployees: employees.length,
    payrollEstimate,
    expensesTotal,
    expensesByCategory,
    profitEstimate,
    estimateNote: 'Estimación basada en la nómina activa prorrateada a este periodo más los gastos registrados; puede haber costos operativos no capturados.'
  };
}

function pctChange(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function buildFinancialOverview(period, anchor) {
  const health = buildBusinessHealth(period, anchor);
  if (!health) return null;

  const [start] = computeRange(period, anchor);
  const prevAnchor = new Date(start.getTime() - 1);
  const prevHealth = buildBusinessHealth(period, prevAnchor);

  const assetRows = query('SELECT * FROM assets');
  const assetsTotalValue = assetRows.reduce((s, a) => s + a.purchase_price * a.quantity, 0);
  const assetsTotalItems = assetRows.reduce((s, a) => s + a.quantity, 0);

  const totalCosts = health.payrollEstimate + health.expensesTotal;
  const prevTotalCosts = prevHealth.payrollEstimate + prevHealth.expensesTotal;
  const margin = health.totalRevenue > 0 ? (health.profitEstimate / health.totalRevenue) * 100 : 0;

  return {
    ...health,
    margin,
    assets: { totalValue: assetsTotalValue, totalItems: assetsTotalItems, count: assetRows.length },
    previousPeriod: {
      range: prevHealth.range,
      totalRevenue: prevHealth.totalRevenue,
      payrollEstimate: prevHealth.payrollEstimate,
      expensesTotal: prevHealth.expensesTotal,
      profitEstimate: prevHealth.profitEstimate
    },
    changePct: {
      revenue: pctChange(health.totalRevenue, prevHealth.totalRevenue),
      costs: pctChange(totalCosts, prevTotalCosts),
      profit: pctChange(health.profitEstimate, prevHealth.profitEstimate)
    }
  };
}

export function saveReportSnapshot(period, anchor, { auto = false, generatedBy = null } = {}) {
  const report = buildSalesReport(period, anchor);
  if (!report) return null;
  const dateStr = anchor.toLocaleDateString('en-CA');
  const { lastInsertRowid } = run(
    'INSERT INTO sales_reports (period, date, range_start, range_end, total_revenue, order_count, data, generated_by, auto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [period, dateStr, report.range.start, report.range.end, report.totalRevenue, report.orderCount, JSON.stringify(report), generatedBy, auto ? 1 : 0]
  );
  return { id: lastInsertRowid, period, date: dateStr, report };
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

export function autoArchiveDailyReport() {
  const state = get('SELECT last_archive FROM sales_report_state WHERE id = 1');
  const today = todayStr();
  if (state && state.last_archive === today) return false;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toLocaleDateString('en-CA');
  const exists = get("SELECT id FROM sales_reports WHERE period = 'day' AND date = ? AND auto = 1", [yStr]);
  if (!exists) {
    saveReportSnapshot('day', yesterday, { auto: true });
  }

  if (state) run('UPDATE sales_report_state SET last_archive = ? WHERE id = 1', [today]);
  else run('INSERT INTO sales_report_state (id, last_archive) VALUES (1, ?)', [today]);
  return true;
}

export function startSalesReportSchedule(checkIntervalMinutes = 60) {
  autoArchiveDailyReport();
  const ms = checkIntervalMinutes * 60 * 1000;
  return setInterval(autoArchiveDailyReport, ms);
}
