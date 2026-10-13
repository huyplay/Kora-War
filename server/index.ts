import { resolve } from 'node:path';
import { GameDatabase } from './database';
import { createGameServer } from './http';
const directory = resolve(process.env.KORA_DATA_DIR || '.data');
const store = new GameDatabase(directory, process.env.KORA_ADMIN_PASSWORD);
const server = createGameServer(store);
const port = Number(process.env.PORT || 8787);
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Kora War: http://127.0.0.1:${port}\nDashboard: http://127.0.0.1:${port}/admin\nLocal admin credentials: ${directory}/admin-setup.txt`,
  ),
);
const stop = () =>
  server.close(() => {
    store.close();
    process.exit(0);
  });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
