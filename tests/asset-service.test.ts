import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { readManagedAsset, syncManagedAsset } from '../server/asset-service';

test('asset bridge persists retry state and refuses corrupt remote bytes', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-bridge-'));
  const store = new GameDatabase(directory, 'test');
  const keys = ['KORA_ASSET_API_URL', 'KORA_ASSET_API_TOKEN', 'KORA_ASSET_READ_SOURCE'];
  const previous = keys.map((key) => process.env[key]);
  const fetchBefore = globalThis.fetch;
  try {
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAwAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
      'base64',
    );
    const asset = importAsset(store, bytes, {
      name: 'Fixture',
      author: 'Test',
      license: 'CC0',
      sourceUrl: 'https://example.com/test',
      rightsConfirmed: true,
    });
    process.env.KORA_ASSET_API_URL = 'http://127.0.0.1:8790';
    process.env.KORA_ASSET_API_TOKEN = 'test-token-'.repeat(4);
    process.env.KORA_ASSET_READ_SOURCE = 'service';
    globalThis.fetch = async () => {
      throw new Error('Unavailable');
    };
    assert.equal(await syncManagedAsset(store, asset.id), 'pending');
    assert.equal(await syncManagedAsset(store, asset.id), 'pending');
    assert.equal(
      store.db.prepare('SELECT attempts FROM asset_sync_pending WHERE asset=?').get(asset.id)?.attempts,
      2,
    );
    assert.equal(await readManagedAsset(store, asset.id), undefined);
    globalThis.fetch = async (_url, init) => {
      assert.equal(
        (init?.headers as Record<string, string>)['X-Kora-Service-Token'],
        process.env.KORA_ASSET_API_TOKEN,
      );
      return new Response('{}', { status: 200 });
    };
    assert.equal(await syncManagedAsset(store, asset.id), 'synced');
    assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM asset_sync_pending').get()?.n, 0);
    globalThis.fetch = async () => new Response(bytes);
    assert.deepEqual(await readManagedAsset(store, asset.id), bytes);
    const corrupt = Buffer.from(bytes);
    corrupt[corrupt.length - 1] ^= 1;
    globalThis.fetch = async () => new Response(corrupt);
    assert.equal(await readManagedAsset(store, asset.id), undefined);
  } finally {
    globalThis.fetch = fetchBefore;
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
