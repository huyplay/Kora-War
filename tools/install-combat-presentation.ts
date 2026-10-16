import { resolve } from 'node:path';
import { loadLocalEnvironment } from '../server/local-environment';
import { GameDatabase } from '../server/database';
import { installCombatPresentation } from '../server/combat-presentation';
loadLocalEnvironment();
const store = new GameDatabase(
  resolve(process.env.KORA_DATA_DIR || '.data'),
  process.env.KORA_ADMIN_PASSWORD,
);
try {
  console.log(JSON.stringify(installCombatPresentation(store)));
} finally {
  store.close();
}
