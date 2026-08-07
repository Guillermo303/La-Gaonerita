import 'dotenv/config';
import { createApp } from './app.js';
import { initDB } from './db.js';
import { startInventorySchedule } from './inventory.js';
import { startReservationSchedule } from './reservations.js';
import { startSalesReportSchedule } from './salesReports.js';
import { startSupplySchedule } from './supplies.js';

// Fija la zona horaria del proceso a la de la taqueria. Si el servidor corre
// en UTC (como Render por defecto), "hoy" para el turno de cocina, las
// recomendaciones y cualquier fecha calculada con `new Date()` quedaria
// desfasado varias horas cada dia -- justo el sintoma de "hora rara" que
// reporto el jefe. Se puede sobreescribir con la env var TZ si hiciera falta.
if (!process.env.TZ) {
  process.env.TZ = 'America/Mexico_City';
}

const { httpServer } = createApp();

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  httpServer.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  startInventorySchedule();
  console.log('Inventario: reinicio diario de existencias activado');
  startReservationSchedule();
  console.log('Reservaciones: asignación automática de mesas activada');
  startSalesReportSchedule();
  console.log('Reportes: archivo automático de ventas (día/semana/mes) activado');
  startSupplySchedule();
  console.log('Insumos: recuento y reinicio semanal activado');
});
