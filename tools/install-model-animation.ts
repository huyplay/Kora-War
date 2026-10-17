import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { loadLocalEnvironment } from '../server/local-environment';
import { installModelAnimation, type ModelAnimationUpdate } from '../server/model-animation-presentation';
loadLocalEnvironment();
const pack = JSON.parse(readFileSync('assets/riot/model-animation.json', 'utf8')) as {
  heroes: ModelAnimationUpdate[];
};
const store = new GameDatabase(
  resolve(process.env.KORA_DATA_DIR || '.data'),
  process.env.KORA_ADMIN_PASSWORD,
);
try {
  console.log(JSON.stringify(installModelAnimation(store, pack.heroes)));
} finally {
  store.close();
}
