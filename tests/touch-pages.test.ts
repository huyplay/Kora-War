import test from 'node:test';
import assert from 'node:assert/strict';
import { pageDeck, pageWindow } from '../src/ui/page-deck';

class Element extends EventTarget {
  children: Element[] = [];
  hidden = false;
  disabled = false;
  textContent = '';
  className = '';
  innerHTML = '';
  onclick?: () => void;
  removed = false;
  classList = { add() {} };
  buttons: Element[] = [];
  status?: Element;
  after() {}
  setAttribute() {}
  setPointerCapture() {}
  hasPointerCapture() {
    return true;
  }
  releasePointerCapture() {}
  querySelectorAll() {
    return this.buttons;
  }
  querySelector() {
    return this.status;
  }
  remove() {
    this.removed = true;
  }
}
test('touch pages expose every card, clamp endpoints, suppress swipe clicks and release listeners', (t) => {
  const nav = new Element();
  nav.buttons = [new Element(), new Element()];
  nav.status = new Element();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => nav } });
  t.after(() =>
    original
      ? Object.defineProperty(globalThis, 'document', original)
      : Reflect.deleteProperty(globalThis, 'document'),
  );
  const root = new Element();
  root.children = Array.from({ length: 18 }, () => new Element());
  const pager = pageDeck(root as unknown as HTMLElement, 6, 'Thẻ');
  const pointer = (type: string, x: number, y = 100) =>
    root.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      }),
    );
  assert.equal(nav.status.textContent, '1 / 3');
  assert.equal(root.children.filter((e) => !e.hidden).length, 6);
  pointer('pointerdown', 300);
  pointer('pointermove', 200);
  pointer('pointerup', 100);
  assert.equal(pager.page, 1);
  assert.equal(root.dispatchEvent(new Event('click', { cancelable: true })), false);
  pointer('pointerdown', 300);
  pointer('pointermove', 290, 200);
  pointer('pointerup', 280, 250);
  assert.equal(pager.page, 1, 'vertical swipes do not change pages');
  nav.buttons[1].onclick!();
  assert.equal(pager.page, 2);
  assert.equal(nav.buttons[1].disabled, true);
  assert.ok(root.children.slice(12).every((e) => !e.hidden));
  pager.show(100);
  assert.equal(pager.page, 2);
  pager.dispose();
  pointer('pointerdown', 100);
  pointer('pointermove', 200);
  pointer('pointerup', 300);
  assert.equal(pager.page, 2);
  assert.ok(nav.removed);
  assert.deepEqual(pageWindow(0, 6, -1), { page: 0, pages: 1, start: 0, end: 0 });
});
