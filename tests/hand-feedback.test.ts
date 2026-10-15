import test from 'node:test';
import assert from 'node:assert/strict';
import { HandReadiness } from '../src/ui/hand-feedback';
import { Sound } from '../src/services/audio';
import { defaultAudio } from '../src/data/media';

test('hand readiness follows UID, mana and cooldown without changing cards or inventing draw delays', () => {
  const hand = new HandReadiness(),
    cards = [
      { uid: 1, id: 'kael', cost: 4, remaining: 0, cooldown: 0 },
      { uid: 2, id: 'ice', cost: 3, remaining: 2, cooldown: 4 },
    ];
  const original = structuredClone(cards);
  let state = hand.update(cards, 3);
  assert.equal(state[0].fill, 0.75);
  assert.equal(state[1].fill, 0.5);
  assert.ok(state.every((c) => !c.ready && !c.arrived));
  hand.waiting = 1;
  state = hand.update(cards, 4);
  assert.equal(state[0].arrived, true);
  assert.equal(state[1].ready, false);
  assert.ok(hand.update(cards, 4).every((c) => !c.arrived));
  const replacement = [
    { ...cards[0], uid: 3 },
    { ...cards[1], remaining: 0 },
  ];
  state = hand.update(replacement, 4);
  assert.equal(hand.waiting, undefined);
  assert.equal(state[0].arrived, false, 'newly drawn ready cards use draw cue, not ready cue');
  assert.equal(state[1].arrived, true, 'cooldown expiring is a readiness transition');
  assert.deepEqual(cards, original);
  hand.reset();
  assert.ok(
    hand.update(replacement, 4).every((c) => !c.arrived),
    'restart/reconnect is quiet',
  );
});
test('hand readiness clamps progress and supports zero cost and live cooldown configuration', () => {
  const hand = new HandReadiness();
  const cards = [{ uid: 1, id: 'spell', cost: 0, remaining: 0, cooldown: 0 }];
  assert.equal(hand.update(cards, 0)[0].fill, 1);
  assert.equal(hand.update([{ ...cards[0], cost: 4 }], -1)[0].fill, 0);
  assert.equal(hand.update([{ ...cards[0], cost: 4 }], 20)[0].fill, 1);
  assert.equal(hand.update([{ ...cards[0], remaining: 10, cooldown: 5 }], 20)[0].fill, 0);
});
test('card audio uses UI gain, distinct fallback pitches, cooldown, voice cap and mute', () => {
  const old = globalThis.AudioContext;
  const sources: any[] = [],
    gains: any[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime(value: number) {
      this.value = value;
    },
    exponentialRampToValueAtTime(value: number) {
      this.value = value;
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
      const result = node();
      gains.push(result);
      return result;
    }
    createStereoPanner = node;
    createDynamicsCompressor = node;
    createOscillator() {
      const source = {
        ...node(),
        frequency: param(),
        type: 'sine',
        onended: undefined as undefined | (() => void),
        start() {},
        stop() {},
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
    profile.ui = 0.25;
    profile.effects = 0;
    profile.maxVoices = 2;
    sound.configure(profile);
    sound.unlock();
    sound.tone('card-draw');
    sound.tone('card-draw');
    sound.tone('card-wait');
    sound.tone('card-ready');
    assert.equal(sources.length, 2);
    assert.equal(sources[0].frequency.value, 780);
    assert.equal(sources[1].frequency.value, 150);
    assert.ok(gains[1].gain.value > 0, 'card cues are audible when combat bus is muted');
    sources[0].onended?.();
    sources[1].onended?.();
    (sound.ctx as unknown as { currentTime: number }).currentTime = 0.5;
    sound.tone('card-ready');
    assert.equal(sources.length, 3);
    assert.equal(sources[2].frequency.value, 1176);
    sources[2].onended?.();
    sound.configure({ ...profile, ui: 0 });
    (sound.ctx as unknown as { currentTime: number }).currentTime = 1;
    sound.tone('card-draw');
    assert.equal(sources.length, 3, 'zero UI bus emits no fallback tone');
    sound.enabled = false;
    sound.tone('card-draw');
    assert.equal(sources.length, 3);
    sound.configure({ ...profile, master: 0.3 });
    assert.equal(gains[0].gain.value, 0.3);
    sound.dispose();
  } finally {
    globalThis.AudioContext = old;
  }
});
