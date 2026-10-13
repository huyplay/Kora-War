import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Isolated PostgreSQL test service started by test-asset-api.ps1; no production database access.
const base = process.env.KORA_ASSET_API_URL!;
const token = process.env.KORA_ASSET_API_TOKEN!;
if (!base || !token || process.env.KORA_TEST_ISOLATED !== '1')
  throw new Error('Use the isolated test runner.');
const file = Buffer.alloc(1644);
file.write('RIFF');
file.writeUInt32LE(file.length - 8, 4);
file.write('WAVEfmt ', 8);
file.writeUInt32LE(16, 16);
file.writeUInt16LE(1, 20);
file.writeUInt16LE(1, 22);
file.writeUInt32LE(8000, 24);
file.writeUInt32LE(16000, 28);
file.writeUInt16LE(2, 32);
file.writeUInt16LE(16, 34);
file.write('data', 36);
file.writeUInt32LE(1600, 40);
const hash = createHash('sha256').update(file).digest('hex');
const input = {
  id: 'test-footstep',
  name: 'Test Footstep',
  kind: 'audio',
  sha256: hash,
  bytes: file.length,
  extension: 'wav',
  archived: false,
  metadata: {
    author: 'Kora War test fixture',
    license: 'CC0-1.0',
    sourceUrl: 'https://kenney.nl/assets/rpg-audio',
    rightsConfirmed: true,
  },
};
async function send(path: string, body?: BodyInit, metadata?: unknown, authenticated = true) {
  return fetch(base + path, {
    method: body ? 'POST' : 'GET',
    body,
    headers: {
      ...(authenticated ? { 'X-Kora-Service-Token': token } : {}),
      ...(metadata ? { 'X-Asset-Metadata': encodeURIComponent(JSON.stringify(metadata)) } : {}),
    },
  });
}
assert.equal((await send('/internal/health', undefined, undefined, false)).status, 401);
assert.equal((await send('/internal/health')).status, 200);
assert.equal((await send('/internal/assets/test-footstep', file, input)).status, 200);
assert.equal((await send('/internal/assets/test-footstep', file, input)).status, 200);
const stored = await (await send('/internal/assets/test-footstep')).json();
assert.equal(stored.sha256, hash);
assert.equal(stored.storageProvider, 'local');
assert.equal(
  createHash('sha256')
    .update(Buffer.from(await (await send('/internal/assets/test-footstep/file')).arrayBuffer()))
    .digest('hex'),
  hash,
);
assert.equal((await send('/internal/assets/test-footstep', Buffer.from('OggSbad'), input)).status, 400);
assert.equal(
  (await send('/internal/assets/test-footstep', file, { ...input, sha256: '0'.repeat(64) })).status,
  400,
);
assert.equal(
  (
    await send('/internal/assets/test-footstep', file, {
      ...input,
      metadata: { ...input.metadata, rightsConfirmed: false },
    })
  ).status,
  400,
);
const altered = Buffer.from(file);
altered[altered.length - 1] ^= 1;
assert.equal(
  (
    await send('/internal/assets/test-footstep', altered, {
      ...input,
      sha256: createHash('sha256').update(altered).digest('hex'),
    })
  ).status,
  409,
);
const snapshot = JSON.stringify({
  schema: 1,
  config: {},
  players: [],
  cards: [],
  ledger: [],
  matches: [],
  revisions: [],
  audit: [],
});
const a = await (await send('/internal/snapshots', snapshot)).json();
const b = await (await send('/internal/snapshots', snapshot)).json();
assert.equal(a.sha256, b.sha256);
assert.equal((await send('/internal/snapshots', JSON.stringify({ schema: 1, sessions: [] }))).status, 400);
for (const invalid of ['{', '[]', '{"schema":"1"}'])
  assert.equal((await send('/internal/snapshots', invalid)).status, 400);
assert.equal((await send('/internal/assets')).status, 200);
console.log(
  'Asset API integration passed: PostgreSQL migration, auth, import/retry, immutable IDs, checksum, provenance, binary roundtrip, snapshot idempotence.',
);
