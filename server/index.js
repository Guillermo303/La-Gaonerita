import 'dotenv/config';
import { createApp } from './app.js';
import { initDB } from './db.js';
import { startBackupSchedule } from './backup.js';
import { startInventorySchedule } from './inventory.js';
import { startReservationSchedule } from './reservations.js';
import { startSalesReportSchedule } from './salesReports.js';
import { startSupplySchedule } from './supplies.js';

const { httpServer } = createApp();

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  httpServer.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  startBackupSchedule(6);
  console.log('Respaldo automático activado (cada 6 horas)');
  startInventorySchedule();
  console.log('Inventario: reinicio diario de existencias activado');
  startReservationSchedule();
  console.log('Reservaciones: asignación automática de mesas activada');
  startSalesReportSchedule();
  console.log('Reportes: archivo automático diario de ventas activado');
  startSupplySchedule();
  console.log('Insumos: recuento y reinicio semanal activado');
});
