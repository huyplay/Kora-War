import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const portProbe = createServer();
await new Promise<void>((r) => portProbe.listen(0, '127.0.0.1', r));
const port = (portProbe.address() as { port: number }).port;
await new Promise<void>((r) => portProbe.close(() => r()));
const dir = mkdtempSync(join(tmpdir(), 'kora-runtime-smoke-'));
const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), KORA_DATA_DIR: dir, KORA_ADMIN_PASSWORD: 'smoke-only-password' },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let errors = '';
child.stderr?.on('data', (data) => (errors += String(data)));
const exited = new Promise<void>((r) => child.once('exit', () => r()));
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Runtime exited: ' + errors);
    try {
      ready = (await fetch(base + '/api/health')).ok;
    } catch {
      /* starting */
    }
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, 'server starts');
  assert.ok((await (await fetch(base + '/')).text()).includes('assets/'), 'production bundle served');
  assert.ok((await (await fetch(base + '/admin')).text()).includes('studio'), 'admin bundle served');
  const content = await (await fetch(base + '/api/content')).json();
  assert.equal(content.content.gameplay.deck.size, 14);
  assert.equal(content.content.communication.reactions.length, 14);
  assert.equal((await fetch(base + '/api/admin/state')).status, 401);
  const player = await fetch(base + '/api/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kora-Request': '1' },
    body: '{}',
  });
  assert.equal(player.status, 200);
  assert.equal((await player.json()).gold, 300);
  console.log('Runtime smoke passed: production bundles, API, module config, auth and isolated player.');
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  await exited;
  if (!resolve(dir).startsWith(resolve(tmpdir()) + sep) || !dir.includes('kora-runtime-smoke-'))
    throw new Error('Invalid smoke cleanup path');
  rmSync(dir, { recursive: true, force: true });
}
