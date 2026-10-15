import test from 'node:test';
import assert from 'node:assert/strict';
import { DefenseState, type DefenseSnapshot } from '../src/ui/defense-state';
import { defaultAudio } from '../src/data/media';
import { Sound } from '../src/services/audio';

const snapshot = (): DefenseSnapshot => ({
  time: 0,
  phase: 'playing',
  cores: [1500, 1500],
  content: { audio: defaultAudio() },
  towers: [
    { id: 'own', side: 0, lane: 1, x: -10, hp: 400, maxHp: 400, cooldown: 0 },
    { id: 'enemy', side: 1, lane: 1, x: 10, hp: 400, maxHp: 400, cooldown: 0 },
  ],
});
test('structure warnings observe own HP deltas, ignore initial/enemy state and never modify combat', () => {
  const alarms = new DefenseState(),
    state = snapshot();
  state.cores = [700, 1200];
  state.towers[0].hp = 200;
  assert.deepEqual(alarms.update(state, 0), { message: '', kind: undefined, red: false, cue: undefined });
  state.cores = [700, 900];
  state.towers[1].hp = 100;
  state.time++;
  assert.equal(alarms.update(state, 0.1).cue, undefined);
  state.towers[0].hp = 190;
  state.time++;
  const before = structuredClone(state),
    frame = alarms.update(state, 0.1);
  assert.equal(frame.cue, 'tower-warning');
  assert.equal(frame.message, 'Trụ giữa đang bị đánh!');
  assert.equal(frame.red, false);
  assert.deepEqual(state, before);
  state.towers[0].hp = 0;
  state.time++;
  assert.equal(alarms.update(state, 0.1).message, 'Trụ giữa đã thất thủ!');
});
test('core warnings take priority, persist through repeated damage and rate-limit from the locked audio binding', () => {
  const alarms = new DefenseState(),
    state = snapshot();
  state.content.audio!.cues['core-warning'] = { assetId: 'qa', volume: 0.3, rate: 1, cooldownMs: 5000 };
  alarms.update(state, 0);
  state.cores = [1450, 1500];
  state.towers[0].hp = 350;
  state.time = 1;
  let frame = alarms.update(state, 0.1);
  assert.equal(frame.cue, 'core-warning');
  assert.equal(frame.red, true);
  state.towers[0].hp = 330;
  state.time++;
  frame = alarms.update(state, 0.5);
  assert.equal(frame.kind, 'core');
  assert.equal(frame.cue, undefined, 'tower noise cannot mask the core');
  state.cores = [1400, 1500];
  state.time++;
  assert.equal(alarms.update(state, 1).cue, undefined);
  state.cores = [1350, 1500];
  state.time++;
  assert.equal(alarms.update(state, 3.6).cue, 'core-warning');
  frame = alarms.update(state, 2.5);
  assert.equal(frame.red, false);
  assert.equal(frame.message, '', 'quiet after the last damage window');
});
test('pause, hidden updates, ended matches, rewind and reset never replay stale warnings', () => {
  const alarms = new DefenseState(),
    state = snapshot();
  alarms.update(state, 0);
  state.cores = [1450, 1500];
  state.time = 1;
  assert.equal(alarms.update(state, 0.1).cue, 'core-warning');
  state.phase = 'paused';
  assert.deepEqual(alarms.update(state, 30), { message: '', red: false });
  state.phase = 'playing';
  assert.equal(alarms.update(state, 0.1).cue, undefined);
  state.cores = [1400, 1500];
  state.time = 2;
  assert.deepEqual(alarms.update(state, 1, false), { message: '', red: false });
  assert.equal(alarms.update(state, 0.1).cue, undefined, 'inactive snapshot is a quiet baseline');
  state.cores = [0, 1500];
  state.phase = 'ended';
  state.time = 3;
  assert.deepEqual(alarms.update(state, 0.1), { message: '', red: false });
  state.phase = 'playing';
  state.time = 0;
  state.cores = [600, 1500];
  assert.equal(alarms.update(state, 0.1).cue, undefined, 'rewind seeds quietly');
  alarms.reset();
  state.cores = [500, 1500];
  assert.equal(alarms.update(state, 0.1).cue, undefined, 'reconnect seeds quietly');
  state.cores = [450, 1500];
  assert.equal(alarms.update(state, 0.1).cue, 'core-warning');
});
test('tower alerts share one cooldown across lanes and honor admin repeat intervals', () => {
  const alarms = new DefenseState(),
    state = snapshot();
  state.content.audio!.cues['tower-warning'] = { assetId: 'qa', volume: 0.3, rate: 1, cooldownMs: 1000 };
  state.towers = [...state.towers, { ...state.towers[0], id: 'own-top', lane: 0 }];
  alarms.update(state, 0);
  state.towers[0].hp = 300;
  state.towers[2].hp = 100;
  state.time = 1;
  let frame = alarms.update(state, 0.1);
  assert.equal(frame.cue, 'tower-warning');
  assert.equal(frame.message, 'Trụ trên đang bị đánh!');
  state.towers[0].hp = 280;
  state.time = 2;
  frame = alarms.update(state, 0.2);
  assert.equal(frame.cue, undefined);
  assert.equal(frame.message, 'Trụ trên đang bị đánh!', 'lane text does not oscillate on every attack');
  state.towers[0].hp = 250;
  state.time = 3;
  assert.equal(alarms.update(state, 0.9).cue, 'tower-warning');
});
test('warning audio is distinct, respects mute/cooldown and takes a bounded priority voice during combat', () => {
  const previous = globalThis.AudioContext,
    sources: any[] = [],
    gains: any[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime(v: number) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    },
  });
  const node = () => ({
    connect() {},
    disconnect() {},
    gain: param(),
    pan: param(),
    threshold: param(),
    ratio: param(),
  });
  globalThis.AudioContext = class {
    currentTime = 0;
    state = 'running';
    destination = {};
    createGain() {
      const n = node();
      gains.push(n);
      return n;
    }
    createStereoPanner = node;
    createDynamicsCompressor = node;
    createOscillator() {
      const source = {
        ...node(),
        frequency: param(),
        type: 'sine',
        onended: undefined as (() => void) | undefined,
        stops: [] as number[],
        start() {},
        stop(time?: number) {
          this.stops.push(time ?? -1);
        },
      };
      sources.push(source);
      return source;
    }
    close() {
      return Promise.resolve();
    }
  } as unknown as typeof AudioContext;
  try {
    const sound = new Sound(),
      profile = defaultAudio();
    profile.maxVoices = 1;
    sound.configure(profile);
    sound.unlock();
    sound.tone('hit');
    sound.tone('core-warning');
    assert.equal(sources.length, 2);
    assert.ok(sources[0].stops.includes(-1), 'combat voice was evicted');
    assert.equal(sources[1].frequency.value, 392);
    assert.ok(sources[1].stops.includes(0.55));
    sound.tone('core-warning');
    assert.equal(sources.length, 2);
    sound.tone('tower-warning');
    assert.equal(sources.length, 3);
    assert.equal(sources[2].frequency.value, 740);
    assert.equal((sound as any).voices.size, 1, 'priority retains the configured voice bound');
    sound.configure({ ...profile, ui: 0 });
    sound.tone('core-warning', 0, undefined, 'muted-test');
    assert.equal(sources.length, 3);
    assert.equal(sources[2].stops.includes(-1), false, 'mute does not evict another voice');
    sound.enabled = false;
    sound.tone('tower-warning', 0, undefined, 'off-test');
    assert.equal(sources.length, 3);
    sound.enabled = true;
    sources[2].onended?.();
    (sound.ctx as any).currentTime = 5;
    sound.configure({ ...profile, effects: 0 });
    sound.tone('core-warning');
    assert.equal(sources.length, 4, 'warnings use the UI mixer');
    sound.stop();
    assert.ok(sources[3].stops.includes(-1));
    sound.dispose();
  } finally {
    globalThis.AudioContext = previous;
  }
});
