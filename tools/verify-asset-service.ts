import { resolve } from 'node:path';
import { GameDatabase } from '../server/database';
import { assetServiceStatus, readManagedAsset } from '../server/asset-service';
import { loadLocalEnvironment } from '../server/local-environment';

loadLocalEnvironment();
process.env.KORA_ASSET_READ_SOURCE = 'service';
const status = await assetServiceStatus();
if (!status.available) throw new Error('Asset service is unavailable; no credentials were logged.');
const store = new GameDatabase(resolve(process.env.KORA_DATA_DIR || '.data'));
try {
  const assets = store.assets(true);
  let bytes = 0;
  for (const asset of assets) {
    const binary = await readManagedAsset(store, asset.id);
    if (!binary) throw new Error(`Missing or corrupt service asset: ${asset.id}`);
    bytes += binary.length;
  }
  console.log(
    `Verified ${assets.length} assets (${(bytes / 1048576).toFixed(2)} MiB) through ${status.database}/${status.storage}; all binary SHA-256 values match.`,
  );
} finally {
  store.close();
}
