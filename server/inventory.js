import { query, get, run } from './db.js';

function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
}

export async function resetStockIfNewDay() {
  const state = await get('SELECT last_reset FROM inventory_state WHERE id = 1');
  const today = todayStr();
  if (state && state.last_reset === today) return false;

  await run('UPDATE menu_items SET stock = max_stock');
  if (state) {
    await run('UPDATE inventory_state SET last_reset = ? WHERE id = 1', [today]);
  } else {
    await run('INSERT INTO inventory_state (id, last_reset) VALUES (1, ?)', [today]);
  }
  return true;
}

export async function decrementStock(menuItemId, quantity) {
  await run('UPDATE menu_items SET stock = GREATEST(0, stock - ?) WHERE id = ?', [quantity, menuItemId]);
}

export function startInventorySchedule(checkIntervalMinutes = 60) {
  resetStockIfNewDay();
  const ms = checkIntervalMinutes * 60 * 1000;
  return setInterval(resetStockIfNewDay, ms);
}
