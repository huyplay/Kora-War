import test from 'node:test';
import assert from 'node:assert/strict';
import { PvpSession } from '../src/services/pvp-session';
import { DEFAULT_DECK } from '../src/data/heroes';
import { DEFAULT_SPELLS } from '../src/data/spells';
const packet = (code = 'ABCDEF123456', version = 1) => ({
  code,
  version,
  waiting: true,
  seed: 1,
  loadout: { deck: DEFAULT_DECK, spells: DEFAULT_SPELLS },
});
test('leaving an expired or unavailable PvP room clears the local session', async (t) => {
  t.mock.method(globalThis, 'fetch', async (path: string) =>
    path.endsWith('/create')
      ? Response.json(packet())
      : Response.json({ error: 'Phòng đã hết hạn.' }, { status: 400 }),
  );
  const session = new PvpSession();
  t.after(() => session.dispose());
  let error = '';
  session.onError = (message) => {
    error = message;
  };
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  assert.equal(session.active, true);
  await session.leave();
  assert.equal(session.active, false);
  assert.match(error, /hết hạn/);
});
test('a late PvP command response cannot resurrect a room after leaving', async (t) => {
  let finish!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.endsWith('/command'))
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Response.json(path.endsWith('/create') ? packet() : { ok: true });
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  let states = 0;
  session.onState = () => {
    states++;
  };
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  const command = session.command('play', 'solan', 1, -11);
  await session.leave();
  finish(Response.json(packet('ABCDEF123456', 2)));
  await command;
  assert.equal(session.active, false);
  assert.equal(states, 1);
});
test('pending leave invalidates command responses before the leave request completes', async (t) => {
  let finishCommand!: (response: Response) => void, finishLeave!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.endsWith('/command'))
      return new Promise<Response>((resolve) => {
        finishCommand = resolve;
      });
    if (path.endsWith('/leave'))
      return new Promise<Response>((resolve) => {
        finishLeave = resolve;
      });
    return Response.json(packet());
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  let states = 0;
  session.onState = () => {
    states++;
  };
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  const command = session.command('play', 'solan', 1, -11),
    leaving = session.leave();
  finishCommand(Response.json(packet('ABCDEF123456', 2)));
  await command;
  assert.equal(states, 1);
  finishLeave(Response.json({ ok: true }));
  await leaving;
  assert.equal(session.active, false);
});
test('a disposed session ignores a pending room creation response', async (t) => {
  let finish!: (response: Response) => void;
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const session = new PvpSession();
  let states = 0;
  session.onState = () => {
    states++;
  };
  const opening = session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  session.dispose();
  finish(Response.json(packet()));
  await opening;
  assert.equal(session.active, false);
  assert.equal(states, 0);
});
test('a fresh tab restores the authenticated current room without a stored code', async (t) => {
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    return Response.json(packet());
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.restore();
  assert.deepEqual(paths, ['/api/pvp/current']);
  assert.equal(session.packet?.code, packet().code);
  assert.equal(session.restoring, false);
});

test('pending leave blocks new commands, room opens and restores even if leaving later fails offline', async (t) => {
  let rejectLeave!: (error: Error) => void;
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    paths.push(path);
    if (path.endsWith('/leave'))
      return new Promise<Response>((_, reject) => {
        rejectLeave = reject;
      });
    return Response.json(packet());
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  const errors: string[] = [];
  session.onError = (message) => errors.push(message);
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  const leaving = session.leave();
  assert.equal(session.active, true, 'retain the packet until local leave finishes');
  assert.match((await session.command('play', 'solan', 1, -11))!, /rời phòng/);
  await assert.rejects(session.open(DEFAULT_DECK, DEFAULT_SPELLS), /rời phòng/);
  await session.restore();
  assert.deepEqual(paths, ['/api/pvp/create', '/api/pvp/leave']);
  rejectLeave(new TypeError('offline during leave'));
  await leaving;
  assert.equal(session.active, false);
  assert.deepEqual(errors, ['offline during leave']);
});

test('repeated leave calls share one request while it is pending', async (t) => {
  let finishLeave!: (response: Response) => void;
  let leaves = 0;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.endsWith('/leave')) {
      leaves++;
      return new Promise<Response>((resolve) => {
        finishLeave = resolve;
      });
    }
    return Response.json(packet());
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  const first = session.leave();
  assert.equal(session.leave(), first);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(leaves, 1);
  finishLeave(Response.json({ ok: true }));
  await first;
  assert.equal(session.active, false);
});

test('an old leave finishing after dispose cannot clear or report an error over a new session', async (t) => {
  let rejectLeave!: (error: Error) => void;
  let creates = 0;
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    if (path.endsWith('/leave'))
      return new Promise<Response>((_, reject) => {
        rejectLeave = reject;
      });
    return Response.json(packet(++creates === 1 ? 'ABCDEF123456' : '123456ABCDEF'));
  });
  const session = new PvpSession();
  t.after(() => session.dispose());
  const errors: string[] = [];
  session.onError = (message) => errors.push(message);
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  const leaving = session.leave();
  await new Promise((resolve) => setImmediate(resolve));
  session.dispose();
  await session.open(DEFAULT_DECK, DEFAULT_SPELLS);
  rejectLeave(new TypeError('old leave failed'));
  await leaving;
  assert.equal(session.active, true);
  assert.equal(session.packet?.code, '123456ABCDEF');
  assert.deepEqual(errors, []);
});
