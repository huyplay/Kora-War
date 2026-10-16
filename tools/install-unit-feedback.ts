import { resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { loadLocalEnvironment } from '../server/local-environment';
import { installUnitFeedback } from '../server/unit-feedback-presentation';
loadLocalEnvironment();
const store = new GameDatabase(
  resolve(process.env.KORA_DATA_DIR || '.data'),
  process.env.KORA_ADMIN_PASSWORD,
);
try {
  console.log(JSON.stringify(installUnitFeedback(store)));
} finally {
  store.close();
}
