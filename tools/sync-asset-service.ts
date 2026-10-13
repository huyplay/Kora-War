import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { GameDatabase } from '../server/database';
import { loadLocalEnvironment } from '../server/local-environment';

loadLocalEnvironment();
const base = process.env.KORA_ASSET_API_URL || 'http://127.0.0.1:8790';
const token = process.env.KORA_ASSET_API_TOKEN;
if (!token || token.length < 32 || token.includes('CHANGE_ME'))
  throw new Error('Configure KORA_ASSET_API_TOKEN.');
const url = new URL(base);
if (
  url.protocol !== 'https:' &&
  !(['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:')
)
  throw new Error('Asset service requires HTTPS outside loopback.');
const store = new GameDatabase(resolve(process.env.KORA_DATA_DIR || '.data'));
async function request(path: string, body?: BodyInit, metadata?: unknown) {
  const response = await fetch(new URL(path, base), {
    method: body ? 'POST' : 'GET',
    signal: AbortSignal.timeout(60000),
    headers: {
      'X-Kora-Service-Token': token!,
      ...(metadata ? { 'X-Asset-Metadata': encodeURIComponent(JSON.stringify(metadata)) } : {}),
    },
    body,
  });
  if (!response.ok)
    throw new Error(`Asset service returned HTTP ${response.status}. No credentials were logged.`);
  return response.json();
}
try {
  await request('/internal/health');
  // All rows/asset IDs come from a single read transaction; live game writes resume after capture.
  const snapshot = store.transaction(() => ({
    schema: 1,
    config: store.config(),
    assets: store.assets(true),
    players: store.db.prepare('SELECT * FROM players').all(),
    cards: store.db.prepare('SELECT * FROM cards').all(),
    ledger: store.db.prepare('SELECT * FROM ledger').all(),
    matches: store.db.prepare('SELECT * FROM matches').all(),
    revisions: store.db.prepare('SELECT * FROM revisions').all(),
    audit: store.db.prepare('SELECT * FROM audit').all(),
  }));
  for (const asset of snapshot.assets) {
    const file = resolve(store.directory, asset.path);
    if (!file.startsWith(resolve(store.directory) + sep)) throw new Error('Asset path escapes workspace.');
    const bytes = readFileSync(file);
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
      throw new Error(`Checksum mismatch: ${asset.id}`);
    await request(`/internal/assets/${asset.id}`, bytes, {
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      sha256: asset.sha256,
      bytes: asset.bytes,
      extension: extname(file).slice(1),
      metadata: asset.metadata,
      archived: !!asset.archived,
    });
    store.db.prepare('DELETE FROM asset_sync_pending WHERE asset = ?').run(asset.id);
  }
  const result = await request('/internal/snapshots', JSON.stringify(snapshot));
  console.log(
    `Synchronized ${snapshot.assets.length} assets; PostgreSQL snapshot checksum ${result.sha256}.`,
  );
  console.log(
    'SQLite remains the active game database; this command does not cut over wallet or match writes.',
  );
} finally {
  store.close();
}
