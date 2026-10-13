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
