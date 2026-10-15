import test from 'node:test';
import assert from 'node:assert/strict';
import { pageDeck, pageWindow } from '../src/ui/page-deck';
import { fitPages } from '../src/ui/fit-pages';

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
  afterElement?: Element;
  clientHeight = 0;
  captures = new Set<number>();
  after(element: Element) {
    this.afterElement = element;
  }
  setAttribute() {}
  setPointerCapture(id: number) {
    this.captures.add(id);
  }
  hasPointerCapture(id: number) {
    return this.captures.has(id);
  }
  releasePointerCapture(id: number) {
    this.captures.delete(id);
  }
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
  const cardLostCapture = Object.assign(new Event('lostpointercapture'), { pointerId: 1 });
  Object.defineProperty(cardLostCapture, 'target', { value: new Element() });
  root.dispatchEvent(cardLostCapture);
  pointer('pointerup', 100);
  assert.equal(pager.page, 1, 'implicit touch capture can transfer from a card to its paging surface');
  assert.equal(root.captures.size, 0, 'completed swipes release capture');
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
  for (const event of ['pointercancel', 'lostpointercapture']) {
    pointer('pointerdown', 100);
    pointer('pointermove', 200);
    assert.equal(root.captures.size, 1);
    pointer(event, 200);
    assert.equal(root.captures.size, 0, `${event} releases capture`);
    pointer('pointerup', 300);
    assert.equal(pager.page, 2, 'interrupted gestures never navigate');
  }
  pointer('pointerdown', 100);
  pointer('pointermove', 200);
  pager.dispose();
  assert.equal(root.captures.size, 0, 'unmount during swipe releases capture');
  pointer('pointerdown', 100);
  pointer('pointermove', 200);
  pointer('pointerup', 300);
  assert.equal(pager.page, 2);
  assert.ok(nav.removed);
  assert.deepEqual(pageWindow(0, 6, -1), { page: 0, pages: 1, start: 0, end: 0 });
});

test('fitted ranking pages preserve the visible anchor on resize and release their observer on close', (t) => {
  const originals = ['document', 'ResizeObserver'].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  let resize = () => {},
    disconnected = false;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => {
        const nav = new Element();
        nav.buttons = [new Element(), new Element()];
        nav.status = new Element();
        return nav;
      },
    },
  });
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  });
  t.after(() =>
    originals.forEach(([key, descriptor]) =>
      descriptor
        ? Object.defineProperty(globalThis, key, descriptor)
        : Reflect.deleteProperty(globalThis, key),
    ),
  );
  const root = new Element();
  root.children = Array.from({ length: 100 }, () => new Element());
  root.clientHeight = 192;
  const pages = fitPages(root as unknown as HTMLElement, 'Xếp hạng');
  assert.equal(root.children.filter((row) => !row.hidden).length, 4);
  for (let i = 0; i < 5; i++) root.afterElement!.buttons[1].onclick!();
  assert.equal(
    root.children.findIndex((row) => !row.hidden),
    20,
  );
  root.clientHeight = 96;
  resize();
  assert.equal(
    root.children.findIndex((row) => !row.hidden),
    20,
  );
  assert.equal(root.afterElement!.status!.textContent, '11 / 50');
  root.clientHeight = 0;
  resize();
  assert.equal(root.afterElement!.status!.textContent, '11 / 50', 'hidden tab retains its page');
  root.clientHeight = 144;
  resize();
  assert.equal(root.children[20].hidden, false, 'previous anchor remains on screen after growing');
  while (!root.afterElement!.buttons[1].disabled) root.afterElement!.buttons[1].onclick!();
  assert.equal(root.children[99].hidden, false, 'last standing stays reachable');
  pages.dispose();
  assert.ok(disconnected);
  assert.ok(root.afterElement!.removed);
});
