import { query, run } from './db.js';

export const CHECKIN_WINDOW_MINUTES = 60; // se marca ocupada 1h antes de la reservación
export const RESERVATION_DURATION_MINUTES = 90;

function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local
}

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function processReservations() {
  const today = todayStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const upcoming = query("SELECT * FROM reservations WHERE status = 'confirmada' AND date = ?", [today]);
  for (const r of upcoming) {
    if (nowMin >= toMinutes(r.time) - CHECKIN_WINDOW_MINUTES) {
      run("UPDATE reservations SET status = 'ocupada' WHERE id = ?", [r.id]);
    }
  }

  const active = query("SELECT * FROM reservations WHERE status = 'ocupada' AND date = ?", [today]);
  for (const r of active) {
    if (nowMin >= toMinutes(r.time) + RESERVATION_DURATION_MINUTES) {
      run("UPDATE reservations SET status = 'completada' WHERE id = ?", [r.id]);
    }
  }

  run("UPDATE reservations SET status = 'completada' WHERE status = 'confirmada' AND date < ?", [today]);
}

export function startReservationSchedule(checkIntervalMinutes = 5) {
  processReservations();
  const ms = checkIntervalMinutes * 60 * 1000;
  return setInterval(processReservations, ms);
}
