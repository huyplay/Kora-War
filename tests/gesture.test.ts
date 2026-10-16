import test from 'node:test';
import assert from 'node:assert/strict';
import { CardGesture } from '../src/engine/input/card-gesture.ts';

type PointerOptions = {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  pointerType?: string;
  isPrimary?: boolean;
  button?: number;
};

function fixture() {
  const previous = ['document', 'window', 'performance'].map(
    (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  const documentEvents = Object.assign(new EventTarget(), { hidden: false });
  const windowEvents = new EventTarget();
  let now = 1000;
  Object.defineProperty(globalThis, 'document', { value: documentEvents, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: windowEvents, configurable: true });
  Object.defineProperty(globalThis, 'performance', {
    value: { now: () => now },
    configurable: true,
  });
  let captured = false;
  let ready = true;
  let failCapture = false;
  let cancels = 0;
  let ends = 0;
  const moves: [string, number, number][] = [];
  const drops: [string, number, number][] = [];
  const target = {
    setPointerCapture() {
      if (failCapture) throw new Error('Pointer no longer active');
      captured = true;
    },
    hasPointerCapture: () => captured,
    releasePointerCapture() {
      captured = false;
      send('lostpointercapture');
    },
  };
  const gesture = new CardGesture({
    canStart: (id) => ready && id === 'solan',
    move: (...args) => moves.push(args),
    drop: (...args) => drops.push(args),
    cancel: () => cancels++,
    end: () => ends++,
  });
  function values(options: PointerOptions = {}) {
    return { pointerId: 1, clientX: 0, clientY: 0, isPrimary: true, button: 0, ...options };
  }
  function begin(options: PointerOptions = {}, id = 'solan') {
    return gesture.begin({ ...values(options), currentTarget: target } as unknown as PointerEvent, id);
  }
  function send(type: string, options: PointerOptions = {}) {
    documentEvents.dispatchEvent(Object.assign(new Event(type), values(options)));
  }
  return {
    gesture,
    begin,
    send,
    moves,
    drops,
    get cancels() {
      return cancels;
    },
    get ends() {
      return ends;
    },
    get captured() {
      return captured;
    },
    ready(value: boolean) {
      ready = value;
    },
    failCapture(value: boolean) {
      failCapture = value;
    },
    advance(ms: number) {
      now += ms;
    },
    blur() {
      windowEvents.dispatchEvent(new Event('blur'));
    },
    hidden(value: boolean) {
      documentEvents.hidden = value;
      documentEvents.dispatchEvent(new Event('visibilitychange'));
    },
    cleanup() {
      gesture.dispose();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

test('normal taps keep clicks, and a primary mouse drag uses the threshold and exact release point', () => {
  const f = fixture();
  try {
    assert.equal(f.begin({}, 'unknown'), false);
    assert.equal(f.begin({ isPrimary: false }), false);
    assert.equal(f.begin({ button: 2 }), false);
    assert.equal(f.captured, false);
    // Undefined pointerType remains supported for older callers/tests.
    assert.equal(f.begin(), true);
    f.send('pointerup');
    assert.equal(f.ends, 1);
    assert.equal(f.gesture.suppressClick, false);
    assert.equal(f.captured, false);
    assert.equal(f.begin({ pointerType: 'mouse' }), true);
    assert.equal(f.begin({ pointerId: 2 }), false);
    f.send('pointermove', { pointerId: 2, clientX: 20, clientY: 20 });
    f.send('pointermove', { clientX: 7.9 });
    assert.deepEqual(f.moves, []);
    f.send('pointermove', { clientX: 8 });
    assert.deepEqual(f.moves, [['solan', 8, 0]]);
    assert.equal(f.gesture.active, true);
    f.send('pointerup', { pointerId: 2 });
    assert.equal(f.ends, 1);
    f.send('pointerup', { clientX: 55.25, clientY: 17.75 });
    f.send('pointerup', { clientX: 55.25, clientY: 17.75 });
    assert.deepEqual(f.drops, [['solan', 55.25, 17.75]]);
    assert.equal(f.ends, 2);
    assert.equal(f.cancels, 0);
    assert.equal(f.captured, false);
    assert.equal(f.gesture.suppressClick, true);
    f.advance(401);
    assert.equal(f.gesture.suppressClick, false);
  } finally {
    f.cleanup();
  }
});

for (const releaseOrder of [
  [1, 2],
  [2, 1],
]) {
  test(`a second touch anywhere cancels and quarantines both fingers through release order ${releaseOrder}`, () => {
    const f = fixture();
    try {
      assert.equal(f.begin({ pointerType: 'touch' }), true);
      f.send('pointermove', { clientX: 20 });
      f.send('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
      assert.equal(f.cancels, 1);
      assert.equal(f.ends, 1);
      assert.equal(f.captured, false);
      assert.equal(f.gesture.active, false);
      f.advance(5000);
      assert.equal(f.gesture.suppressClick, true);
      assert.equal(f.begin({ pointerId: 3, pointerType: 'touch' }), false);
      f.send('pointerup', { pointerId: releaseOrder[0] });
      f.advance(5000);
      assert.equal(f.gesture.suppressClick, true, 'the remaining held finger stays quarantined');
      f.send('pointermove', { pointerId: releaseOrder[1], clientX: 100 });
      assert.equal(f.moves.length, 1);
      f.send('pointerup', { pointerId: releaseOrder[1] });
      assert.equal(f.gesture.suppressClick, true, 'the last release cannot produce a click');
      assert.deepEqual(f.drops, []);
      assert.equal(f.cancels, 1);
      assert.equal(f.ends, 1);
      f.advance(401);
      assert.equal(f.gesture.suppressClick, false);
      assert.equal(f.begin({ pointerType: 'touch' }), true);
    } finally {
      f.cleanup();
    }
  });
}

test('cancelled quarantine fingers and additional touches remain blocked until every finger ends', () => {
  const f = fixture();
  try {
    f.begin({ pointerType: 'touch' });
    f.send('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    f.send('pointerdown', { pointerId: 3, pointerType: 'touch', isPrimary: false });
    f.send('pointercancel', { pointerId: 1 });
    f.send('pointerup', { pointerId: 2 });
    f.advance(5000);
    assert.equal(f.gesture.suppressClick, true);
    f.send('pointercancel', { pointerId: 3 });
    f.advance(401);
    assert.equal(f.gesture.suppressClick, false);
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
  } finally {
    f.cleanup();
  }
});

test('a second touch cancels a pending card tap before it reaches the drag threshold', () => {
  const f = fixture();
  try {
    f.begin({ pointerType: 'touch' });
    f.send('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    f.send('pointerup');
    f.send('pointerup', { pointerId: 2 });
    assert.equal(f.gesture.suppressClick, true);
    assert.deepEqual(f.moves, []);
    assert.deepEqual(f.drops, []);
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
  } finally {
    f.cleanup();
  }
});

test('own capture loss cancels exactly once while unrelated capture loss leaves a drag intact', () => {
  const f = fixture();
  try {
    f.begin({ pointerType: 'touch' });
    f.send('pointermove', { clientX: 20 });
    f.send('lostpointercapture', { pointerId: 2 });
    assert.equal(f.gesture.active, true);
    f.send('lostpointercapture');
    f.send('lostpointercapture');
    f.send('pointerup', { clientX: 30 });
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
    assert.deepEqual(f.drops, []);
    assert.equal(f.captured, false);
  } finally {
    f.cleanup();
  }
});

test('readiness is rechecked on movement, including before the drag threshold', () => {
  const f = fixture();
  try {
    f.begin();
    f.ready(false);
    f.send('pointermove', { clientX: 1 });
    f.send('pointermove', { clientX: 20 });
    f.send('pointerup', { clientX: 20 });
    assert.deepEqual(f.moves, []);
    assert.deepEqual(f.drops, []);
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
    assert.equal(f.gesture.suppressClick, true);
  } finally {
    f.cleanup();
  }
});

test('a ready drag that becomes invalid before release cannot drop', () => {
  const f = fixture();
  try {
    f.begin();
    f.send('pointermove', { clientX: 20 });
    f.ready(false);
    f.send('pointerup', { clientX: 30 });
    assert.deepEqual(f.drops, []);
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
    assert.equal(f.captured, false);
  } finally {
    f.cleanup();
  }
});

test('blur and hidden reset cancelled touch state without leaving an input lock', () => {
  const f = fixture();
  try {
    for (const reset of [() => f.blur(), () => f.hidden(true)]) {
      f.begin({ pointerType: 'touch' });
      f.send('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
      reset();
      f.advance(5000);
      assert.equal(f.gesture.suppressClick, false);
      assert.equal(f.begin({ pointerType: 'touch' }), true, 'stale touch IDs were cleared');
      f.hidden(false);
      f.send('pointerup');
    }
    assert.equal(f.cancels, 2);
    assert.equal(f.ends, 4);
    assert.deepEqual(f.drops, []);
  } finally {
    f.cleanup();
  }
});

test('blur and hidden cancel an owned drag or pending tap exactly once', () => {
  const f = fixture();
  try {
    f.begin({ pointerType: 'touch' });
    f.send('pointermove', { clientX: 20 });
    f.blur();
    f.blur();
    f.send('pointerup', { clientX: 30 });
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
    assert.equal(f.captured, false);
    assert.equal(f.begin({ pointerType: 'touch' }), true);
    f.hidden(true);
    f.hidden(true);
    f.send('pointerup');
    assert.equal(f.cancels, 2);
    assert.equal(f.ends, 2);
    assert.deepEqual(f.drops, []);
    f.advance(5000);
    assert.equal(f.gesture.suppressClick, false);
  } finally {
    f.cleanup();
  }
});

test('capture failure cancels safely and dispose removes listeners and pointer quarantine', () => {
  const f = fixture();
  try {
    f.failCapture(true);
    assert.equal(f.begin({ pointerType: 'touch' }), false);
    assert.equal(f.cancels, 1);
    assert.equal(f.ends, 1);
    f.send('pointerup');
    f.failCapture(false);
    assert.equal(f.begin({ pointerType: 'touch' }), true);
    f.send('pointermove', { clientX: 20 });
    f.send('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    f.gesture.dispose();
    f.advance(5000);
    assert.equal(f.gesture.suppressClick, false);
    assert.equal(f.begin(), false);
    f.send('pointermove', { clientX: 40 });
    f.send('pointerup', { clientX: 40 });
    f.send('pointerdown', { pointerId: 3, pointerType: 'touch' });
    assert.deepEqual(f.drops, []);
    assert.equal(f.moves.length, 1);
    assert.equal(f.cancels, 2);
    assert.equal(f.ends, 2);
  } finally {
    f.cleanup();
  }
});
