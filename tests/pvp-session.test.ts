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
