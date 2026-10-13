import { extname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { GameDatabase } from './database';

/** Private server-to-server transport. No service token is sent to a browser. */
function configuration() {
  const token = process.env.KORA_ASSET_API_TOKEN,
    base = process.env.KORA_ASSET_API_URL;
  if (!base || !token || token.includes('CHANGE_ME')) return undefined;
  const url = new URL(base);
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))
  )
    throw new Error('Asset API requires HTTPS outside loopback.');
  return { base, token };
}
export async function assetServiceStatus() {
  const config = configuration();
  if (!config) return { configured: false, available: false, database: 'sqlite', storage: 'local' };
  try {
    const response = await fetch(new URL('/internal/health', config.base), {
      headers: { 'X-Kora-Service-Token': config.token },
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error('Unavailable');
    const status = await response.json();
    return { configured: true, available: true, database: 'postgresql', storage: status.storage as string };
  } catch {
    return { configured: true, available: false, database: 'sqlite', storage: 'local' };
  }
}
export async function syncManagedAsset(store: GameDatabase, id: string) {
  const config = configuration();
  if (!config) return 'local' as const;
  const asset = store.asset(id);
  if (!asset) throw new Error('Unknown asset.');
  const bytes = readFileSync(join(store.directory, asset.path as string));
  try {
    const response = await fetch(new URL(`/internal/assets/${id}`, config.base), {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'X-Kora-Service-Token': config.token,
        'X-Asset-Metadata': encodeURIComponent(
          JSON.stringify({
            id: asset.id,
            name: asset.name,
            kind: asset.kind,
            sha256: asset.sha256,
            bytes: asset.bytes,
            extension: extname(asset.path as string).slice(1),
            metadata: JSON.parse(asset.metadata as string),
            archived: !!asset.archived,
          }),
        ),
      },
      body: bytes,
    });
    if (!response.ok) throw new Error('Sync failed.');
    store.db.prepare('DELETE FROM asset_sync_pending WHERE asset=?').run(id);
    return 'synced' as const;
  } catch {
    store.db
      .prepare(
        'INSERT INTO asset_sync_pending(asset) VALUES(?) ON CONFLICT(asset) DO UPDATE SET attempts=attempts+1',
      )
      .run(id);
    store.audit('asset.sync.pending', { id });
    return 'pending' as const;
  }
}
export async function readManagedAsset(store: GameDatabase, id: string): Promise<Buffer | undefined> {
  if (process.env.KORA_ASSET_READ_SOURCE !== 'service') return;
  const config = configuration(),
    asset = store.asset(id);
  if (!config || !asset) return;
  try {
    const response = await fetch(new URL(`/internal/assets/${id}/file`, config.base), {
      headers: { 'X-Kora-Service-Token': config.token },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return;
    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength && contentLength !== asset.bytes) return;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
      return;
    return bytes;
  } catch {
    return;
  }
}
