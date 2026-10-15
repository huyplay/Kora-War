import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { PvpSession } from '../src/services/pvp-session';
import { DEFAULT_DECK } from '../src/data/heroes';
import { DEFAULT_SPELLS } from '../src/data/spells';
import { PvpRooms } from '../server/pvp';
import { defaultContent } from '../src/data/content';
const packet = (code = 'ABCDEF123456', version = 1) => ({
  code,
  version,
  waiting: true,
  seed: 1,
  loadout: { deck: DEFAULT_DECK, spells: DEFAULT_SPELLS },
});
function storage(t: TestContext, code?: string) {
  const values = new Map<string, string>(code ? [['kora-pvp-room', code]] : []);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
  return values;
}
test('a transient restore failure preserves the room code and retries without a reload', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values = storage(t, packet().code);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    if (++requests === 1) throw new TypeError('offline');
    return Response.json(packet());
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.restore();
  assert.equal(values.get('kora-pvp-room'), packet().code);
  assert.equal(session.restoring, true);
  assert.equal(session.connected, false);
  t.mock.timers.tick(1500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.packet?.code, packet().code);
  assert.equal(session.restoring, false);
  assert.equal(session.connected, true);
});

test('restore retries keep new room requests blocked and stop after authoritative no-room response', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values = storage(t),
    paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    if (paths.length === 1) return Response.json({ error: 'busy' }, { status: 503 });
    return Response.json(null);
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.restore();
  await assert.rejects(session.open(DEFAULT_DECK, DEFAULT_SPELLS), /khôi phục/);
  await assert.rejects(session.queue('ranked', [], 1), /khôi phục/);
  assert.deepEqual(paths, ['/api/pvp/current']);
  t.mock.timers.tick(1500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.restoring, false);
  assert.equal(session.connected, true);
  assert.equal(session.active, false);
  assert.equal(values.size, 0);
  t.mock.timers.tick(5000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(paths.length, 2);
});

test('restore retries stop on disposal/leave, and terminal authentication failures clear the saved room', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const values = storage(t, packet().code);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    throw new TypeError('offline');
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.restore();
  session.dispose();
  t.mock.timers.tick(1500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  await session.restore();
  await session.leave();
  t.mock.timers.tick(1500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.equal(values.size, 0);
  values.set('kora-pvp-room', packet().code);
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ error: 'AUTH: sign in' }, { status: 401 });
  });
  await session.restore();
  assert.equal(session.restoring, false);
  assert.equal(values.size, 0);
  t.mock.timers.tick(5000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 3);
});

test('duplicate restore attempts share one request and stale failures cannot revive retries', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  storage(t, packet().code);
  let fail!: (error: Error) => void,
    calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Promise<Response>((_, reject) => {
      fail = reject;
    });
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  const first = session.restore(),
    second = session.restore();
  assert.equal(calls, 1);
  session.dispose();
  fail(new TypeError('late failure'));
  await Promise.all([first, second]);
  t.mock.timers.tick(5000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(session.restoring, false);
});

test('lost create, join and queue responses discover the server room without resubmitting a mutation', async (t) => {
  storage(t);
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    if (path !== '/api/pvp/current') throw new TypeError('response lost after commit');
    return Response.json(packet());
  });
  for (const kind of ['create', 'join', 'queue'] as const) {
    const session = new PvpSession();
    t.after(() => session.dispose());
    if (kind === 'queue') await session.queue('ranked', [], 1);
    else await session.open(DEFAULT_DECK, DEFAULT_SPELLS, kind === 'join' ? packet().code : undefined);
    assert.equal(session.packet?.code, packet().code);
    session.dispose();
  }
  assert.deepEqual(paths, [
    '/api/pvp/create',
    '/api/pvp/current',
    '/api/pvp/join',
    '/api/pvp/current',
    '/api/pvp/queue',
    '/api/pvp/current',
  ]);
});

test('room requests reject concurrent transitions and do not recover validation errors or a canceled response', async (t) => {
  storage(t);
  const paths: string[] = [];
  let fail!: (error: Error) => void;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    return new Promise<Response>((_, reject) => {
      fail = reject;
    });
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  const pending = session.queue('ranked', [], 1);
  await assert.rejects(session.open(DEFAULT_DECK, DEFAULT_SPELLS), /đang xử lý/i);
  await session.restore();
  assert.equal(paths.length, 1);
  session.dispose();
  fail(new TypeError('canceled request'));
  await assert.rejects(pending);
  assert.equal(paths.length, 1);
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    return Response.json({ error: 'invalid deck' }, { status: 400 });
  });
  await assert.rejects(session.queue('ranked', [], 1), /invalid deck/);
  assert.equal(paths.length, 2);
  assert.equal(session.active, false);
});

test('lost room response reports the original error when no server room exists, and ignores late recovery after leave', async (t) => {
  storage(t);
  let recover!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.endsWith('/queue')) throw new TypeError('queue offline');
    return Response.json(null);
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await assert.rejects(session.queue('ranked', [], 1), /queue offline/);
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.endsWith('/queue')) throw new TypeError('queue response lost');
    return new Promise<Response>((resolve) => {
      recover = resolve;
    });
  });
  const pending = session.queue('ranked', [], 1);
  await new Promise((resolve) => setImmediate(resolve));
  await session.leave();
  recover(Response.json(packet()));
  await pending;
  assert.equal(session.active, false);
});
test('an expired stored room falls back to the current authenticated room', async (t) => {
  const values = storage(t, 'EXPIRED00000'),
    paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    return path.startsWith('/api/pvp/state')
      ? Response.json({ error: 'Không có quyền truy cập phòng.' }, { status: 400 })
      : Response.json(packet());
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.restore();
  assert.deepEqual(paths, ['/api/pvp/state?metadata=1&code=EXPIRED00000', '/api/pvp/current']);
  assert.equal(session.packet?.code, packet().code);
  assert.equal(values.get('kora-pvp-room'), packet().code);
});
test('a lost command response is retried once using the identical command ID', async (t) => {
  const commands: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string, options?: RequestInit) => {
    if (path.endsWith('/command')) {
      commands.push(JSON.parse(options!.body as string).command);
      if (commands.length === 1) throw new TypeError('response lost');
    }
    return Response.json(packet(undefined, path.endsWith('/command') ? 2 : 1));
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  assert.equal(await session.command('play', 'solan', 1, -11), null);
  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0], commands[1]);
});
test('disposing a session aborts in-flight polling and commands', async (t) => {
  let commandSignal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', async (path: string, options?: RequestInit) => {
    if (!path.endsWith('/command')) return Response.json(packet());
    commandSignal = options!.signal as AbortSignal;
    return new Promise<Response>((_, reject) =>
      commandSignal!.addEventListener('abort', () => reject(commandSignal!.reason), { once: true }),
    );
  });
  const session = new PvpSession();
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  const command = session.command('play', 'solan', 1, -11);
  session.dispose();
  assert.equal(commandSignal?.aborted, true);
  await command;
});
test('retrying a command after the server applied it spends mana only once', async (t) => {
  const rooms = new PvpRooms(() => 1000),
    loadout = { deck: DEFAULT_DECK, spells: DEFAULT_SPELLS };
  const room = rooms.create('alice', loadout, defaultContent());
  rooms.join('bob', room.code, loadout);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (path: string, options?: RequestInit) => {
    if (!path.endsWith('/command')) return Response.json(rooms.state('alice', room.code));
    const data = JSON.parse(options!.body as string);
    const response = rooms.command('alice', data.code, data.command);
    if (++requests === 1) throw new TypeError('response lost after commit');
    return Response.json(response);
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  assert.equal(await session.command('play', 'solan', 1, -11), null);
  const state = rooms.state('alice', room.code).state!;
  assert.equal(requests, 2);
  assert.equal(state.units.length, 1);
  assert.equal(state.mana[0], 1);
});
test('a rejected command is not retried', async (t) => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (!path.endsWith('/command')) return Response.json(packet());
    requests++;
    return Response.json({ error: 'Lệnh không hợp lệ.' }, { status: 400 });
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  assert.match((await session.command('play', 'solan', 1, -11))!, /không hợp lệ/);
  assert.equal(requests, 1);
});
test('poll recovery notifies connection loss and restoration without losing membership', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let polls = 0;
  const changes: boolean[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.startsWith('/api/pvp/state') && ++polls === 1) throw new TypeError('offline');
    return Response.json(packet(undefined, 2));
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  session.onConnectionChange = (connected) => changes.push(connected);
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  t.mock.timers.tick(100);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.connected, false);
  assert.equal(session.active, true);
  t.mock.timers.tick(1500);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.connected, true);
  assert.deepEqual(changes, [false, true]);
});
