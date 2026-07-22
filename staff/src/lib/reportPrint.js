import { formatPrice } from './utils';

const periodLabels = { day: 'Día', week: 'Semana', month: 'Mes' };
const methodLabels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const expenseCategoryLabels = { renta: 'Renta', servicios: 'Servicios', insumos: 'Insumos', mantenimiento: 'Mantenimiento', marketing: 'Marketing', impuestos: 'Impuestos', otro: 'Otro' };

function pctLabel(pct) {
  if (pct === null || pct === undefined) return 'n/a';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function fmtHour(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

function reportHTML(report, period, dateLabel) {
  const genDate = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  const topRows = report.topProducts.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td class="right">${p.quantity}</td>
      <td class="right">${formatPrice(p.revenue)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="muted center">Sin ventas en este periodo</td></tr>';

  const busyHours = report.hourly.filter(h => h.orders > 0);
  const hourRows = busyHours.length ? busyHours.map(h => `
    <tr>
      <td>${fmtHour(h.hour)}</td>
      <td class="right">${h.orders}</td>
      <td class="right">${formatPrice(h.revenue)}</td>
    </tr>
  `).join('') : '<tr><td colspan="3" class="muted center">Sin ventas en este periodo</td></tr>';

  const dailyRows = report.daily.length ? report.daily.map(d => `
    <tr>
      <td>${d.date}</td>
      <td class="right">${d.orders}</td>
      <td class="right">${formatPrice(d.revenue)}</td>
    </tr>
  `).join('') : '';

  const paymentRows = report.paymentBreakdown.map(p => `
    <tr>
      <td>${methodLabels[p.method] || p.method}</td>
      <td class="right">${p.count}</td>
      <td class="right">${formatPrice(p.revenue)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="muted center">Sin ventas en este periodo</td></tr>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte de Ventas - ${periodLabels[period]}</title>
<style>
  @page { size: letter; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
  .muted { color: #666; }
  .center { text-align: center; }
  .right { text-align: right; }
  .header { border-bottom: 3px solid #c0392b; padding-bottom: 10px; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 8px; }
  .stat { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
  .stat .value { font-size: 20px; font-weight: bold; margin-top: 2px; }
  .highlight { background: #fdf0ec; border: 1px solid #e8b8ab; border-radius: 6px; padding: 10px 14px; margin: 12px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 5px 8px; border-bottom: 1px solid #eee; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; }
  .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>LA GAONERITA</h1>
    <div class="muted">Reporte de Ventas · ${periodLabels[period]} · ${dateLabel}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="label">Ingresos Totales</div><div class="value">${formatPrice(report.totalRevenue)}</div></div>
    <div class="stat"><div class="label">Órdenes Pagadas</div><div class="value">${report.orderCount}</div></div>
    <div class="stat"><div class="label">Ticket Promedio</div><div class="value">${formatPrice(report.avgTicket)}</div></div>
  </div>

  ${report.peakHour ? `<div class="highlight">🕐 <strong>Hora de mayor afluencia:</strong> ${fmtHour(report.peakHour.hour)} con ${report.peakHour.orders} orden(es) y ${formatPrice(report.peakHour.revenue)} en ventas.</div>` : ''}

  <h2>Productos Más Vendidos</h2>
  <table>
    <thead><tr><th>#</th><th>Producto</th><th class="right">Cantidad</th><th class="right">Ingresos</th></tr></thead>
    <tbody>${topRows}</tbody>
  </table>

  <h2>Ventas por Hora</h2>
  <table>
    <thead><tr><th>Hora</th><th class="right">Órdenes</th><th class="right">Ingresos</th></tr></thead>
    <tbody>${hourRows}</tbody>
  </table>

  ${dailyRows ? `
  <h2>Ventas por Día</h2>
  <table>
    <thead><tr><th>Fecha</th><th class="right">Órdenes</th><th class="right">Ingresos</th></tr></thead>
    <tbody>${dailyRows}</tbody>
  </table>` : ''}

  <h2>Ventas por Método de Pago</h2>
  <table>
    <thead><tr><th>Método</th><th class="right">Órdenes</th><th class="right">Ingresos</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>

  <div class="footer">Reporte generado el ${genDate}</div>
</body>
</html>`;
}

function financeHTML(overview, period, dateLabel) {
  const genDate = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  const totalCosts = overview.payrollEstimate + overview.expensesTotal;

  const expenseRows = overview.expensesByCategory.map(c => `
    <tr>
      <td>${expenseCategoryLabels[c.category] || c.category}</td>
      <td class="right">${c.count}</td>
      <td class="right">${formatPrice(c.total)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="muted center">Sin gastos en este periodo</td></tr>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Panorama Financiero - ${periodLabels[period]}</title>
<style>
  @page { size: letter; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
  .muted { color: #666; }
  .center { text-align: center; }
  .right { text-align: right; }
  .header { border-bottom: 3px solid #c0392b; padding-bottom: 10px; margin-bottom: 16px; }
  .pnl { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .pnl td { padding: 8px 6px; border-bottom: 1px solid #eee; }
  .pnl .label { color: #444; }
  .pnl .amount { text-align: right; font-weight: bold; }
  .pnl .total td { border-top: 2px solid #333; border-bottom: none; font-size: 15px; padding-top: 10px; }
  .positive { color: #1a7a3d; }
  .negative { color: #b8371a; }
  .stats { display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 130px; border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
  .stat .value { font-size: 18px; font-weight: bold; margin-top: 2px; }
  .note { font-size: 11px; color: #888; font-style: italic; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 5px 8px; border-bottom: 1px solid #eee; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; }
  .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>LA GAONERITA</h1>
    <div class="muted">Panorama Financiero · ${periodLabels[period]} · ${dateLabel}</div>
  </div>

  <h2>Estado de Resultados</h2>
  <table class="pnl">
    <tr><td class="label">Ingresos</td><td class="amount">${formatPrice(overview.totalRevenue)}</td></tr>
    <tr><td class="label">(-) Nómina</td><td class="amount">-${formatPrice(overview.payrollEstimate)}</td></tr>
    <tr><td class="label">(-) Gastos Operativos</td><td class="amount">-${formatPrice(overview.expensesTotal)}</td></tr>
    <tr class="total"><td class="label"><strong>Utilidad Neta</strong></td><td class="amount ${overview.profitEstimate >= 0 ? 'positive' : 'negative'}">${formatPrice(overview.profitEstimate)}</td></tr>
  </table>
  <div class="note">Margen de utilidad: ${overview.margin.toFixed(1)}% · Comparado al periodo anterior: ingresos ${pctLabel(overview.changePct.revenue)}, costos ${pctLabel(overview.changePct.costs)}, utilidad ${pctLabel(overview.changePct.profit)}.</div>
  <div class="note">${overview.estimateNote}</div>

  <h2>Patrimonio (Activos)</h2>
  <div class="stats">
    <div class="stat"><div class="label">Valor Total de Activos</div><div class="value">${formatPrice(overview.assets.totalValue)}</div></div>
    <div class="stat"><div class="label">Total de Artículos</div><div class="value">${overview.assets.totalItems}</div></div>
    <div class="stat"><div class="label">Tipos de Activos</div><div class="value">${overview.assets.count}</div></div>
  </div>

  <h2>Gastos por Categoría</h2>
  <table>
    <thead><tr><th>Categoría</th><th class="right">Registros</th><th class="right">Total</th></tr></thead>
    <tbody>${expenseRows}</tbody>
  </table>

  <h2>Comparación con Periodo Anterior</h2>
  <table>
    <thead><tr><th></th><th class="right">Este Periodo</th><th class="right">Periodo Anterior</th><th class="right">Cambio</th></tr></thead>
    <tbody>
      <tr><td>Ingresos</td><td class="right">${formatPrice(overview.totalRevenue)}</td><td class="right">${formatPrice(overview.previousPeriod.totalRevenue)}</td><td class="right">${pctLabel(overview.changePct.revenue)}</td></tr>
      <tr><td>Costos Totales</td><td class="right">${formatPrice(totalCosts)}</td><td class="right">${formatPrice(overview.previousPeriod.payrollEstimate + overview.previousPeriod.expensesTotal)}</td><td class="right">${pctLabel(overview.changePct.costs)}</td></tr>
      <tr><td>Utilidad Neta</td><td class="right">${formatPrice(overview.profitEstimate)}</td><td class="right">${formatPrice(overview.previousPeriod.profitEstimate)}</td><td class="right">${pctLabel(overview.changePct.profit)}</td></tr>
    </tbody>
  </table>

  <div class="footer">Reporte generado el ${genDate}</div>
</body>
</html>`;
}

export function printFinanceOverview(overview, period, dateLabel) {
  const win = window.open('', '_blank', 'width=850,height=900');
  if (!win) return false;
  win.document.write(financeHTML(overview, period, dateLabel));
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}

export function downloadFinanceCSV(overview, period, dateLabel) {
  const lines = [];
  lines.push(['Panorama Financiero', periodLabels[period], dateLabel].map(csvEscape).join(','));
  lines.push('');
  lines.push(['Ingresos', overview.totalRevenue.toFixed(2)].map(csvEscape).join(','));
  lines.push(['Nómina', overview.payrollEstimate.toFixed(2)].map(csvEscape).join(','));
  lines.push(['Gastos Operativos', overview.expensesTotal.toFixed(2)].map(csvEscape).join(','));
  lines.push(['Utilidad Neta', overview.profitEstimate.toFixed(2)].map(csvEscape).join(','));
  lines.push(['Margen (%)', overview.margin.toFixed(1)].map(csvEscape).join(','));
  lines.push('');
  lines.push(['Valor Total de Activos', overview.assets.totalValue.toFixed(2)].map(csvEscape).join(','));
  lines.push(['Total de Artículos', overview.assets.totalItems].map(csvEscape).join(','));
  lines.push('');
  lines.push(['Categoría de Gasto', 'Registros', 'Total'].map(csvEscape).join(','));
  overview.expensesByCategory.forEach(c => lines.push([expenseCategoryLabels[c.category] || c.category, c.count, c.total.toFixed(2)].map(csvEscape).join(',')));
  lines.push('');
  lines.push(['Comparación', 'Este Periodo', 'Periodo Anterior', 'Cambio %'].map(csvEscape).join(','));
  lines.push(['Ingresos', overview.totalRevenue.toFixed(2), overview.previousPeriod.totalRevenue.toFixed(2), overview.changePct.revenue ?? ''].map(csvEscape).join(','));
  lines.push(['Costos Totales', (overview.payrollEstimate + overview.expensesTotal).toFixed(2), (overview.previousPeriod.payrollEstimate + overview.previousPeriod.expensesTotal).toFixed(2), overview.changePct.costs ?? ''].map(csvEscape).join(','));
  lines.push(['Utilidad Neta', overview.profitEstimate.toFixed(2), overview.previousPeriod.profitEstimate.toFixed(2), overview.changePct.profit ?? ''].map(csvEscape).join(','));

  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `panorama-financiero-${period}-${dateLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printSalesReport(report, period, dateLabel) {
  const win = window.open('', '_blank', 'width=850,height=900');
  if (!win) return false;
  win.document.write(reportHTML(report, period, dateLabel));
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}

function csvEscape(val) {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadSalesCSV(report, period, dateLabel) {
  const lines = [];
  lines.push(['Reporte de Ventas', periodLabels[period], dateLabel].map(csvEscape).join(','));
  lines.push('');
  lines.push(['Ingresos totales', report.totalRevenue].map(csvEscape).join(','));
  lines.push(['Órdenes pagadas', report.orderCount].map(csvEscape).join(','));
  lines.push(['Ticket promedio', report.avgTicket.toFixed(2)].map(csvEscape).join(','));
  lines.push('');
  lines.push(['Producto', 'Cantidad', 'Ingresos'].map(csvEscape).join(','));
  report.topProducts.forEach(p => lines.push([p.name, p.quantity, p.revenue.toFixed(2)].map(csvEscape).join(',')));
  lines.push('');
  lines.push(['Hora', 'Órdenes', 'Ingresos'].map(csvEscape).join(','));
  report.hourly.filter(h => h.orders > 0).forEach(h => lines.push([fmtHour(h.hour), h.orders, h.revenue.toFixed(2)].map(csvEscape).join(',')));
  if (report.daily.length) {
    lines.push('');
    lines.push(['Fecha', 'Órdenes', 'Ingresos'].map(csvEscape).join(','));
    report.daily.forEach(d => lines.push([d.date, d.orders, d.revenue.toFixed(2)].map(csvEscape).join(',')));
  }
  lines.push('');
  lines.push(['Método de Pago', 'Órdenes', 'Ingresos'].map(csvEscape).join(','));
  report.paymentBreakdown.forEach(p => lines.push([methodLabels[p.method] || p.method, p.count, p.revenue.toFixed(2)].map(csvEscape).join(',')));

  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-ventas-${period}-${dateLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
