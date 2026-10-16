import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HandFeedback, type HandPresentationCard } from '../src/ui/hand-feedback';

class FakeAnimation {
  playState = 'running';
  onfinish?: () => void;
  oncancel?: () => void;
  pauses = 0;
  plays = 0;
  cancel() {
    this.playState = 'idle';
    this.oncancel?.();
  }
  pause() {
    this.pauses++;
    this.playState = 'paused';
  }
  play() {
    this.plays++;
    this.playState = 'running';
  }
  finish() {
    this.playState = 'finished';
    this.onfinish?.();
  }
}

class FakeElement {
  children: FakeElement[] = [];
  parent?: FakeElement;
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  properties = new Map<string, string>();
  classes = new Set<string>();
  animations: FakeAnimation[] = [];
  listeners: (() => void)[] = [];
  shortcut = { textContent: '' };
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    toggle: (name: string, enabled: boolean) => {
      if (enabled) this.classes.add(name);
      else this.classes.delete(name);
    },
  };
  style = { setProperty: (name: string, value: string) => this.properties.set(name, value) };
  constructor(private owner: { activeElement?: FakeElement }) {}
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  querySelector(selector: string) {
    if (selector === 'kbd') return this.shortcut;
    const uid = selector.match(/data-card-uid="(\d+)"/)?.[1];
    return this.children.find((element) => element.dataset.cardUid === uid) ?? null;
  }
  insertBefore(element: FakeElement, before: FakeElement | null) {
    // Moving a surviving node keeps its listeners and focus.
    const previous = element.parent?.children;
    if (previous) previous.splice(previous.indexOf(element), 1);
    const index = before ? this.children.indexOf(before) : this.children.length;
    this.children.splice(index, 0, element);
    element.parent = this;
  }
  remove() {
    if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = undefined;
    if (this.owner.activeElement === this) this.owner.activeElement = undefined;
  }
  replaceChildren() {
    for (const child of [...this.children]) child.remove();
  }
  getBoundingClientRect() {
    return { left: this.dataset.cardUid ? 100 : 500, top: 200, width: 60, height: 80 };
  }
  animate() {
    const animation = new FakeAnimation();
    this.animations.push(animation);
    return animation;
  }
}

const card = (uid: number, id = `hero-${uid}`): HandPresentationCard => ({
  uid,
  id,
  cost: 4,
  remaining: 0,
  cooldown: 0,
});

function fixture(t: TestContext) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const owner: { activeElement?: FakeElement } = {};
  const created: FakeElement[] = [];
  const document = {
    createElement(tag: string) {
      assert.equal(tag, 'template');
      const template = {
        content: { firstElementChild: undefined as FakeElement | undefined },
        set innerHTML(html: string) {
          const button = new FakeElement(owner);
          button.dataset.hero = html.match(/data-hero="([^"]+)"/)![1];
          created.push(button);
          this.content.firstElementChild = button;
        },
      };
      return template;
    },
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  const hand = new FakeElement(owner),
    pile = new FakeElement(owner),
    sounds: string[] = [],
    clicks: string[] = [];
  let reduced = false;
  const feedback = new HandFeedback(
    hand as unknown as HTMLElement,
    pile as unknown as HTMLElement,
    (cue) => sounds.push(cue),
    () => reduced,
  );
  t.after(() => feedback.dispose());
  const reconcile = (cards: HandPresentationCard[], animate = true) =>
    feedback.reconcile(
      cards,
      (id) => `<button data-hero="${id}"><kbd></kbd></button>`,
      (button) => {
        const element = button as unknown as FakeElement;
        element.listeners.push(() => clicks.push(element.dataset.hero));
      },
      animate,
    );
  const start = (cards: HandPresentationCard[], mana = 10) => {
    reconcile(cards, false);
    feedback.update(cards, mana, true);
  };
  const allAnimations = () => [...created, pile].flatMap((element) => element.animations);
  const active = () =>
    allAnimations().filter((animation) => ['running', 'paused'].includes(animation.playState));
  return {
    hand,
    pile,
    owner,
    created,
    sounds,
    clicks,
    feedback,
    reconcile,
    start,
    allAnimations,
    active,
    setReduced: (value: boolean) => (reduced = value),
  };
}

test('opening hands and precombat exchanges establish a quiet baseline', (t) => {
  const f = fixture(t),
    opening = [card(1), card(2), card(3)];
  f.reconcile(opening, false);
  f.feedback.update(opening, 0, false);
  f.feedback.wait(1);
  f.feedback.resync();
  const exchanged = [card(4), opening[1], card(5)];
  f.reconcile(exchanged, false);
  f.feedback.update(exchanged, 10, false);
  f.feedback.update(exchanged, 10, true);
  assert.deepEqual(f.sounds, []);
  assert.equal(f.allAnimations().length, 0);
  assert.equal(f.hand.classes.has('hand-paused'), false);
});

test('a live draw replaces its physical slot while preserving other nodes, listeners and focus', (t) => {
  const f = fixture(t),
    cards = [card(1), card(2), card(3)];
  f.start(cards);
  const untouched = f.hand.children.slice(1);
  f.owner.activeElement = untouched[1];
  const replacement = [card(4, cards[0].id), ...cards.slice(1)];
  f.reconcile(replacement);
  f.feedback.update(replacement, 10, true);
  assert.equal(f.created.length, 4);
  assert.deepEqual(f.hand.children.slice(1), untouched);
  assert.equal(f.owner.activeElement, untouched[1]);
  untouched[0].listeners[0]();
  assert.deepEqual(f.clicks, [cards[1].id]);
  assert.deepEqual(
    f.hand.children.map((element) => element.shortcut.textContent),
    ['1', '2', '3'],
  );
  assert.equal(f.hand.children[0].animations.length, 1);
  assert.ok(untouched.every((element) => element.animations.length === 0 && element.listeners.length === 1));
  assert.equal(f.pile.animations.length, 1);
  assert.deepEqual(f.sounds, ['card-draw']);
});

test('readiness emits once per transition; waits require a live, unavailable card', (t) => {
  const f = fixture(t),
    cards = [card(1), card(2)];
  f.start(cards, 0);
  f.feedback.wait(99);
  assert.deepEqual(f.sounds, []);
  f.feedback.wait(1);
  assert.equal(f.hand.children[0].classes.has('waiting-card'), true);
  f.feedback.update(cards, 4, true);
  f.feedback.update(cards, 4, true);
  f.feedback.wait(1);
  assert.deepEqual(f.sounds, ['card-wait', 'card-ready']);
  assert.equal(f.hand.children[0].classes.has('waiting-card'), false);
  assert.equal(f.hand.children[0].attributes.get('aria-disabled'), 'false');
  assert.equal(f.hand.children[0].properties.get('--wait-fill'), '100%');
  f.feedback.update(cards, 0, true);
  f.feedback.wait(1);
  f.feedback.update(cards, 4, false);
  assert.equal(f.hand.children[0].classes.has('waiting-card'), false);
  const count = f.sounds.length;
  f.feedback.update(cards, 4, true);
  f.feedback.update(cards, 4, true);
  assert.equal(f.sounds.length, count, 'offscreen readiness must not replay on resume');
});

test('suspend and authoritative resync silence all missed replacements and clear waiting', (t) => {
  const f = fixture(t),
    cards = [card(1), card(2), card(3)];
  f.start(cards, 0);
  f.feedback.wait(1);
  f.feedback.suspend();
  assert.equal(f.active().length, 0);
  assert.equal(f.hand.children[0].classes.has('waiting-card'), false);
  assert.equal(f.hand.classes.has('hand-paused'), true);
  const missed = [card(4), card(5), card(6)];
  f.reconcile(missed);
  f.feedback.update(missed, 10, false);
  f.feedback.wait(4);
  f.feedback.update(missed, 10, true);
  assert.deepEqual(f.sounds, ['card-wait']);
  f.feedback.resync();
  const reconnected = [card(7), card(8), card(9)];
  f.reconcile(reconnected);
  f.feedback.update(reconnected, 10, true);
  assert.deepEqual(f.sounds, ['card-wait']);
  f.reconcile([card(10), ...reconnected.slice(1)]);
  assert.deepEqual(f.sounds, ['card-wait', 'card-draw'], 'ordinary combat draws resume after the baseline');
});

test('ordinary pause retains animation progress and resumes each active animation', (t) => {
  const f = fixture(t),
    cards = [card(1), card(2)];
  f.start(cards);
  const next = [card(3), cards[1]];
  f.reconcile(next);
  const animations = f.active();
  assert.equal(animations.length, 2);
  f.feedback.update(next, 10, false);
  assert.ok(animations.every((animation) => animation.playState === 'paused' && animation.pauses === 1));
  f.feedback.update(next, 10, false);
  assert.ok(animations.every((animation) => animation.pauses === 1));
  f.feedback.update(next, 10, true);
  assert.ok(animations.every((animation) => animation.playState === 'running' && animation.plays === 1));
  assert.deepEqual(f.sounds, ['card-draw']);
});

test('a readiness threshold crossed on the first resumed update still emits its cue once', (t) => {
  const f = fixture(t),
    cards = [card(1)];
  f.start(cards, 3);
  f.feedback.update(cards, 3, false);
  f.feedback.update(cards, 4, true);
  f.feedback.update(cards, 4, true);
  assert.deepEqual(f.sounds, ['card-ready']);
  assert.equal(f.hand.children[0].animations.length, 1);
  assert.equal(f.hand.children[0].attributes.get('aria-disabled'), 'false');
});

test('changing reduced motion cancels in-flight effects and prevents new motion without suppressing cues', (t) => {
  const f = fixture(t),
    cards = [card(1), card(2)];
  f.start(cards);
  const next = [card(3), cards[1]];
  f.reconcile(next);
  const previous = f.active();
  f.setReduced(true);
  f.feedback.refreshMotion();
  assert.ok(previous.every((animation) => animation.playState === 'idle'));
  assert.equal(f.active().length, 0);
  f.feedback.update(next, 0, true);
  const total = f.allAnimations().length;
  f.feedback.wait(3);
  f.feedback.update(next, 10, true);
  assert.equal(f.allAnimations().length, total);
  assert.deepEqual(f.sounds, ['card-draw', 'card-wait', 'card-ready']);
});

test('feedback keeps one animation per element, caps the total and ignores stale completion callbacks', (t) => {
  const f = fixture(t),
    cards = Array.from({ length: 20 }, (_, index) => card(index + 1));
  f.start(cards, 0);
  for (const value of cards) f.feedback.wait(value.uid);
  assert.equal(f.active().length, 16);
  assert.equal(f.hand.children[0].animations[0].playState, 'idle');
  const last = f.hand.children.at(-1)!;
  const old = last.animations.at(-1)!;
  const lateCompletion = old.onfinish;
  f.feedback.wait(20);
  assert.equal(old.playState, 'idle');
  assert.equal(f.active().length, 16);
  const current = last.animations.at(-1)!;
  lateCompletion?.();
  f.feedback.suspend();
  assert.equal(current.playState, 'idle', 'a stale callback cannot orphan the replacement animation');
  assert.equal(f.active().length, 0);
});

test('removed cards, completed animations, reset and disposal release animation ownership', (t) => {
  const f = fixture(t),
    cards = [card(1), card(2)];
  f.start(cards, 0);
  f.feedback.wait(1);
  const removed = f.hand.children[0],
    animation = removed.animations[0];
  f.reconcile([cards[1]], false);
  assert.equal(animation.playState, 'idle');
  assert.equal(removed.parent, undefined);
  const count = f.sounds.length;
  f.feedback.wait(1);
  assert.equal(f.sounds.length, count);
  f.feedback.wait(2);
  const completed = f.hand.children[0].animations.at(-1)!;
  completed.finish();
  f.feedback.reset();
  assert.equal(completed.playState, 'finished', 'finished effects have already released their ownership');
  assert.equal(f.hand.children.length, 0);
  f.start(cards, 0);
  f.feedback.wait(2);
  assert.equal(f.active().length, 1);
  f.feedback.dispose();
  assert.equal(f.active().length, 0);
  assert.equal(f.hand.children.length, 0);
});
