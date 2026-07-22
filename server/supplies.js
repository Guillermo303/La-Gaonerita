import { query, get, run } from './db.js';
import { computeRange } from './salesReports.js';

export function currentWeekStart(anchor = new Date()) {
  const [start] = computeRange('week', anchor);
  return start.toLocaleDateString('en-CA');
}

export function decrementSuppliesForOrder(orderItems) {
  for (const item of orderItems) {
    if (!item.menu_item_id) continue;
    const links = query('SELECT * FROM menu_item_supplies WHERE menu_item_id = ?', [item.menu_item_id]);
    for (const link of links) {
      run('UPDATE supply_items SET consumed = consumed + ? WHERE id = ?', [link.quantity_per_unit * item.quantity, link.supply_item_id]);
    }
  }
}

function weekEndFromStart(weekStartStr) {
  const start = new Date(`${weekStartStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end.toLocaleDateString('en-CA');
}

export function checkWeeklyReset() {
  const state = get('SELECT last_week_start FROM supply_state WHERE id = 1');
  const thisWeek = currentWeekStart();
  if (state && state.last_week_start === thisWeek) return false;

  const items = query('SELECT * FROM supply_items WHERE week_start IS NOT NULL AND week_start != ?', [thisWeek]);
  for (const item of items) {
    run(
      'INSERT INTO supply_week_history (supply_item_id, supply_name, unit, week_start, week_end, purchased, consumed, remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [item.id, item.name, item.unit, item.week_start, weekEndFromStart(item.week_start), item.purchased, item.consumed, item.purchased - item.consumed]
    );
    run('UPDATE supply_items SET purchased = 0, consumed = 0, week_start = ? WHERE id = ?', [thisWeek, item.id]);
  }

  if (state) run('UPDATE supply_state SET last_week_start = ? WHERE id = 1', [thisWeek]);
  else run('INSERT INTO supply_state (id, last_week_start) VALUES (1, ?)', [thisWeek]);
  return true;
}

export function startSupplySchedule(checkIntervalMinutes = 60) {
  checkWeeklyReset();
  const ms = checkIntervalMinutes * 60 * 1000;
  return setInterval(checkWeeklyReset, ms);
}
