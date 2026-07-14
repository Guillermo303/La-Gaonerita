import 'dotenv/config';
import { createApp } from './app.js';
import { initDB } from './db.js';

const { httpServer } = createApp();

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  httpServer.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
});
