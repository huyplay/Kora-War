import test from 'node:test';
import assert from 'node:assert/strict';
import { DragPreview, dragPreviewPosition } from '../src/ui/drag-preview';

test('drag image stays above the finger and inside mobile edges without changing original targeting coordinates', () => {
  const pointer = { x: 400, y: 200 },
    before = { ...pointer };
  assert.deepEqual(dragPreviewPosition(pointer.x, pointer.y, 844, 390), { x: 365, y: 84 });
  for (const [width, height] of [
    [844, 390],
    [667, 375],
    [568, 320],
  ])
    for (const [x, y] of [
      [0, 0],
      [width, height],
      [width / 2, height / 2],
      [-30, -20],
      [width + 30, height + 50],
    ]) {
      const p = dragPreviewPosition(x, y, width, height);
      assert.ok(p.x >= 8 && p.y >= 8);
      assert.ok(p.x + 70 <= width - 8);
      assert.ok(p.y + 88 <= height - 8);
    }
  assert.deepEqual(pointer, before);
});
test('drag preview reuses image DOM, switches valid state/cost and hides without capturing touch', () => {
  let builds = 0,
    html = '';
  const cost = { textContent: '' },
    state = { textContent: '' },
    attributes = new Map<string, string>();
  const host = {
    hidden: true,
    dataset: {} as Record<string, string>,
    style: { transform: '' },
    setAttribute: (k: string, v: string) => attributes.set(k, v),
    removeAttribute: (k: string) => {
      attributes.delete(k);
      if (k === 'data-valid') delete host.dataset.valid;
    },
    set innerHTML(value: string) {
      html = value;
      builds++;
    },
    querySelector: (selector: string) => (selector.includes('cost') ? cost : state),
  } as unknown as HTMLElement;
  const preview = new DragPreview(host),
    card = { id: 'solan', art: '<img src="test" alt=""/>', cost: 3, valid: true };
  preview.show(card, 400, 200, 844, 390);
  assert.equal(builds, 1);
  assert.equal(host.hidden, false);
  assert.equal(host.dataset.valid, 'true');
  assert.equal(cost.textContent, '3');
  assert.equal(state.textContent, '✓');
  assert.equal(attributes.get('aria-hidden'), 'true');
  assert.match(html, /drag-preview-art/);
  for (let i = 0; i < 100; i++) preview.show({ ...card, valid: false }, 400 + i, 200, 844, 390);
  assert.equal(builds, 1);
  assert.equal(host.dataset.valid, 'false');
  assert.equal(state.textContent, '×');
  preview.hide();
  assert.equal(host.hidden, true);
  assert.equal(host.dataset.valid, undefined);
  preview.show({ ...card, id: 'ice', art: '<span>❄</span>', cost: 2 }, 10, 10, 844, 390);
  assert.equal(builds, 2);
  assert.equal(cost.textContent, '2');
  assert.equal(state.textContent, '✓');
  assert.match(html, /❄/);
});
