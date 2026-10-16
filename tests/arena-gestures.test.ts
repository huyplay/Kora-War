import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGestures } from '../src/app/arena-gestures';

class Canvas extends EventTarget {
  clientHeight = 500;
  setPointerCapture() {}
}
function pointer(canvas: Canvas, type: string, id: number, x: number) {
  canvas.dispatchEvent(
    Object.assign(new Event(type), { pointerId: id, pointerType: 'touch', clientX: x, clientY: 100 }),
  );
}
test('pinch zoom suppresses spell clicks through both releases and cleans up all listeners', () => {
  const canvas = new Canvas(),
    factors: number[] = [];
  let cancelled = 0;
  const gestures = new ArenaGestures(
    canvas as unknown as HTMLCanvasElement,
    { zoomBy: (factor) => factors.push(factor), resetZoom() {} },
    () => true,
    () => cancelled++,
  );
  pointer(canvas, 'pointerdown', 1, 100);
  assert.equal(gestures.suppressClick, false);
  pointer(canvas, 'pointerdown', 2, 200);
  pointer(canvas, 'pointermove', 2, 250);
  assert.deepEqual(factors, [1.5]);
  assert.equal(cancelled, 1);
  pointer(canvas, 'pointerup', 2, 250);
  assert.equal(gestures.suppressClick, true);
  pointer(canvas, 'pointerup', 1, 100);
  assert.equal(gestures.suppressClick, true);
  gestures.dispose();
  pointer(canvas, 'pointerdown', 1, 100);
  pointer(canvas, 'pointerdown', 2, 200);
  pointer(canvas, 'pointermove', 2, 300);
  assert.equal(factors.length, 1);
});
test('wheel zoom normalizes line deltas and is inactive outside battle', () => {
  const canvas = new Canvas(),
    factors: number[] = [];
  let enabled = false;
  const gestures = new ArenaGestures(
    canvas as unknown as HTMLCanvasElement,
    { zoomBy: (factor) => factors.push(factor), resetZoom() {} },
    () => enabled,
    () => {},
  );
  const wheel = () =>
    Object.assign(new Event('wheel', { cancelable: true }), {
      deltaY: -3,
      deltaMode: 1,
      clientX: 200,
      clientY: 200,
    });
  const outside = wheel();
  canvas.dispatchEvent(outside);
  assert.equal(outside.defaultPrevented, false);
  assert.equal(factors.length, 0);
  enabled = true;
  const inside = wheel();
  canvas.dispatchEvent(inside);
  assert.equal(inside.defaultPrevented, true);
  assert.ok(factors[0] > 1);
  gestures.dispose();
});

function session() {
  const documentSurface = Object.assign(new EventTarget(), { hidden: false });
  const windowSurface = new EventTarget();
  let enabled = true,
    failCapture = false,
    now = 1000,
    cancelled = 0;
  class CapturedCanvas extends EventTarget {
    clientHeight = 376;
    captured = new Set<number>();
    setPointerCapture(id: number) {
      if (failCapture) throw Error('inactive pointer');
      this.captured.add(id);
    }
    hasPointerCapture(id: number) {
      return this.captured.has(id);
    }
    releasePointerCapture(id: number) {
      if (this.captured.delete(id))
        this.dispatchEvent(
          Object.assign(new Event('lostpointercapture'), { pointerId: id, pointerType: 'touch' }),
        );
    }
  }
  const canvas = new CapturedCanvas(),
    zooms: { factor: number; x?: number; y?: number }[] = [];
  const gestures = new ArenaGestures(
    canvas as unknown as HTMLCanvasElement,
    { zoomBy: (factor, x, y) => zooms.push({ factor, x, y }), resetZoom() {} },
    () => enabled,
    () => cancelled++,
    {
      document: documentSurface,
      window: windowSurface,
      now: () => now,
    },
  );
  const send = (
    type: string,
    id: number,
    x = 100,
    y = 100,
    surface: EventTarget = canvas,
    pointerType = 'touch',
  ) =>
    surface.dispatchEvent(
      Object.assign(new Event(type), { pointerId: id, pointerType, clientX: x, clientY: y }),
    );
  return {
    canvas,
    documentSurface,
    windowSurface,
    gestures,
    zooms,
    send,
    get cancelled() {
      return cancelled;
    },
    set enabled(value: boolean) {
      enabled = value;
    },
    set failCapture(value: boolean) {
      failCapture = value;
    },
    advance(ms = 1000) {
      now += ms;
    },
  };
}

test('ordinary taps release capture and keep deployment clicks while unrelated pointers do nothing', () => {
  const f = session();
  try {
    f.send('pointerdown', 1);
    f.send('lostpointercapture', 99);
    f.send('pointerup', 99);
    f.send('pointermove', 99, 500);
    assert.equal(f.cancelled, 0);
    assert.equal(f.gestures.suppressClick, false);
    f.send('pointerup', 1, 120);
    assert.equal(f.canvas.captured.size, 0);
    assert.equal(f.cancelled, 0);
    assert.equal(f.gestures.suppressClick, false);
    assert.equal(f.zooms.length, 0);
    f.send('pointerdown', 2, 100, 100, f.canvas, 'mouse');
    assert.equal(f.canvas.captured.size, 0, 'mouse clicks never join a touch pinch');
  } finally {
    f.gestures.dispose();
  }
});

test('a second touch on HUD cancels an owned arena touch through both physical releases', () => {
  const f = session();
  try {
    f.send('pointerdown', 1);
    f.send('pointerdown', 2, 200, 300, f.documentSurface);
    assert.equal(f.cancelled, 1);
    assert.equal(f.canvas.captured.size, 0);
    f.send('pointerup', 1, 100, 100, f.documentSurface);
    f.advance(5000);
    assert.equal(f.gestures.suppressClick, true);
    f.send('pointerup', 2, 200, 300, f.documentSurface);
    f.advance(451);
    assert.equal(f.gestures.suppressClick, false);
    assert.equal(f.zooms.length, 0);
  } finally {
    f.gestures.dispose();
  }
});

test('third finger cancels pinch and all delayed releases on HUD must finish before input is re-enabled', () => {
  const f = session();
  try {
    f.send('pointerdown', 1, 100);
    f.send('pointerdown', 2, 200);
    f.send('pointermove', 2, 250);
    assert.deepEqual(f.zooms, [{ factor: 1.5, x: 175, y: 100 }]);
    f.send('pointerdown', 3, 400);
    assert.equal(f.canvas.captured.size, 0);
    f.advance(5000);
    f.send('pointerup', 3, 400, 100, f.documentSurface);
    f.send('pointermove', 2, 500);
    f.send('pointerdown', 4, 600);
    f.send('pointerup', 1, 100, 100, f.documentSurface);
    f.send('pointerup', 2, 500, 100, f.documentSurface);
    f.advance(5000);
    assert.equal(f.gestures.suppressClick, true, 'a held extra finger outlives any timer');
    assert.equal(f.zooms.length, 1);
    f.send('pointerup', 4, 600, 100, f.documentSurface);
    assert.equal(f.gestures.suppressClick, true);
    f.advance(451);
    assert.equal(f.gestures.suppressClick, false);
    f.send('pointerdown', 5, 100);
    f.send('pointerdown', 6, 200);
    f.send('pointermove', 6, 250);
    assert.deepEqual(f.zooms[1], { factor: 1.5, x: 175, y: 100 });
  } finally {
    f.gestures.dispose();
  }
});

test('own capture loss and pointer cancellation cancel once and cannot become deployment clicks', () => {
  for (const interruption of ['lostpointercapture', 'pointercancel']) {
    const f = session();
    try {
      f.send('pointerdown', 1, 100);
      f.send('pointerdown', 2, 200);
      assert.equal(f.cancelled, 1, 'pinch clears selection');
      f.send(interruption, 1);
      assert.equal(f.cancelled, 2);
      assert.equal(f.canvas.captured.size, 0);
      f.send(interruption, 1);
      assert.equal(f.cancelled, 2);
      f.advance(5000);
      assert.equal(f.gestures.suppressClick, true);
      f.send('pointerup', 1, 100, 100, f.documentSurface);
      f.send('pointerup', 2, 200, 100, f.documentSurface);
      f.advance(451);
      assert.equal(f.gestures.suppressClick, false);
      f.send('pointerdown', 3, 100);
      f.send('pointerup', 3);
      assert.equal(f.gestures.suppressClick, false);
    } finally {
      f.gestures.dispose();
    }
  }
});

test('capture failure is quarantined and disposal releases captures and removes every surface listener', () => {
  const f = session();
  f.failCapture = true;
  f.send('pointerdown', 1);
  assert.equal(f.cancelled, 1);
  assert.equal(f.gestures.suppressClick, true);
  f.failCapture = false;
  f.send('pointerup', 1, 100, 100, f.documentSurface);
  f.advance(451);
  f.send('pointerdown', 2, 100);
  f.send('pointerdown', 3, 200);
  assert.equal(f.canvas.captured.size, 2);
  f.gestures.dispose();
  assert.equal(f.canvas.captured.size, 0);
  const cancelled = f.cancelled;
  f.send('pointerdown', 4, 100);
  f.send('pointerdown', 5, 200);
  f.send('pointermove', 5, 500);
  f.documentSurface.hidden = true;
  f.documentSurface.dispatchEvent(new Event('visibilitychange'));
  f.windowSurface.dispatchEvent(new Event('blur'));
  f.windowSurface.dispatchEvent(new Event('pagehide'));
  assert.equal(f.canvas.captured.size, 0);
  assert.equal(f.cancelled, cancelled);
  assert.equal(f.zooms.length, 0);
});

test('hidden, blur and pagehide clear stale fingers and permit a fresh pinch after returning', () => {
  for (const interruption of ['visibilitychange', 'blur', 'pagehide']) {
    const f = session();
    try {
      f.send('pointerdown', 1, 100);
      f.send('pointerdown', 2, 200);
      f.send('pointermove', 2, 250);
      f.documentSurface.dispatchEvent(new Event('visibilitychange'));
      assert.equal(f.cancelled, 1, 'visible documents do not cancel input');
      if (interruption === 'visibilitychange') {
        f.documentSurface.hidden = true;
        f.documentSurface.dispatchEvent(new Event(interruption));
      } else f.windowSurface.dispatchEvent(new Event(interruption));
      assert.equal(f.canvas.captured.size, 0);
      assert.equal(f.cancelled, 2);
      f.documentSurface.hidden = false;
      f.advance(451);
      assert.equal(f.gestures.suppressClick, false);
      f.send('pointerdown', 3, 100);
      f.send('pointerdown', 4, 200);
      f.send('pointermove', 4, 250);
      assert.deepEqual(
        f.zooms[1],
        { factor: 1.5, x: 175, y: 100 },
        'old distance never leaks into a new pinch',
      );
    } finally {
      f.gestures.dispose();
    }
  }
});

test('input becoming disabled mid-pinch cancels and cannot resume until old touches are released', () => {
  const f = session();
  try {
    f.send('pointerdown', 1, 100);
    f.send('pointerdown', 2, 200);
    f.enabled = false;
    f.send('pointermove', 2, 300);
    assert.equal(f.canvas.captured.size, 0);
    assert.equal(f.cancelled, 2);
    assert.equal(f.zooms.length, 0);
    f.enabled = true;
    f.advance(5000);
    f.send('pointermove', 2, 400);
    assert.equal(f.gestures.suppressClick, true);
    assert.equal(f.zooms.length, 0);
    f.send('pointerup', 1, 100, 100, f.documentSurface);
    f.send('pointerup', 2, 400, 100, f.documentSurface);
    f.advance(451);
    f.send('pointerdown', 3, 100);
    f.send('pointerdown', 4, 200);
    f.send('pointermove', 4, 300);
    assert.equal(f.zooms[0].factor, 2);
  } finally {
    f.gestures.dispose();
  }
});

test('replacing one finger before the other lifts cannot restart an unfinished pinch or jump zoom', () => {
  const f = session();
  try {
    f.send('pointerdown', 1, 100);
    f.send('pointerdown', 2, 200);
    f.send('pointerup', 1);
    f.advance(5000);
    assert.equal(f.gestures.suppressClick, true);
    f.send('pointerdown', 3, 500);
    f.send('pointermove', 3, 800);
    f.send('pointermove', 2, 0);
    assert.equal(f.zooms.length, 0);
    assert.equal(f.canvas.captured.size, 0);
    f.send('pointerup', 2, 100, 100, f.documentSurface);
    f.send('pointerup', 3, 100, 100, f.documentSurface);
    f.advance(451);
    assert.equal(f.gestures.suppressClick, false);
  } finally {
    f.gestures.dispose();
  }
});

test('wheel uses page and pixel deltas, ignores non-finite data and does not interfere with an active pinch', () => {
  const f = session();
  const wheel = (deltaY: number, deltaMode = 0) =>
    f.canvas.dispatchEvent(
      Object.assign(new Event('wheel', { cancelable: true }), {
        deltaY,
        deltaMode,
        clientX: 10,
        clientY: 20,
      }),
    );
  try {
    wheel(-0.1, 2);
    assert.equal(f.zooms[0].factor, Math.exp(37.6 * 0.002));
    wheel(20);
    assert.equal(f.zooms[1].factor, Math.exp(-20 * 0.002));
    wheel(NaN);
    assert.equal(f.zooms.length, 2);
    f.send('pointerdown', 1, 100);
    f.send('pointerdown', 2, 200);
    wheel(-20);
    assert.equal(f.zooms.length, 2);
  } finally {
    f.gestures.dispose();
  }
});
