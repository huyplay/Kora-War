import test from 'node:test';
import assert from 'node:assert/strict';
import { ManaDisplay } from '../src/ui/mana-display';

class Classes {
  values = new Set<string>();
  toggle(name: string, force: boolean) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
  contains(name: string) {
    return this.values.has(name);
  }
}
class Styles {
  values = new Map<string, string>();
  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }
}
class Cell {
  classList = new Classes();
  style = new Styles();
}
class Track {
  attributes = new Map<string, string>();
  style = new Styles();
  children: Cell[] = [];
  builds = 0;
  set innerHTML(html: string) {
    this.builds++;
    this.children = Array.from(html.matchAll(/class="mana-gem"/g), () => new Cell());
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}
class FakeAnimation {
  onfinish?: () => void;
  oncancel?: () => void;
  cancelled = 0;
  active = true;
  cancel() {
    this.cancelled++;
    this.active = false;
    this.oncancel?.();
  }
  finish() {
    this.active = false;
    this.onfinish?.();
  }
}
function fixture() {
  const track = new Track();
  const root = { dataset: {} as Record<string, string> };
  const animations: FakeAnimation[] = [];
  const amount = {
    textContent: '',
    dataset: {} as Record<string, string>,
    animate() {
      const animation = new FakeAnimation();
      animations.push(animation);
      return animation as unknown as Animation;
    },
  };
  let reduced = false;
  const display = new ManaDisplay(
    root as unknown as HTMLElement,
    track as unknown as HTMLElement,
    amount as unknown as HTMLElement,
    () => reduced,
  );
  return {
    display,
    track,
    root,
    amount,
    animations,
    reduced(value: boolean) {
      reduced = value;
    },
    activeCount: () => animations.filter((animation) => animation.active).length,
  };
}

test('initial snapshots and a reset match stay quiet while a real spend pulses once', () => {
  const f = fixture();
  f.display.update(9, 10);
  assert.equal(f.animations.length, 0);
  f.display.update(6, 10);
  assert.equal(f.animations.length, 1);
  const cells = [...f.track.children];
  f.display.reset();
  assert.equal(f.animations[0].cancelled, 1);
  assert.equal(f.activeCount(), 0);
  f.display.update(4, 10);
  assert.equal(f.animations.length, 1, 'new starting mana is not a spend from the previous match');
  assert.deepEqual(f.track.children, cells);
  assert.equal(f.track.builds, 1);
  f.display.update(3, 10);
  assert.equal(f.animations.length, 2);
  f.animations[1].finish();
  f.display.dispose();
  assert.equal(f.animations[1].cancelled, 0, 'finished animation is no longer owned');
});

test('rapid spends keep at most one animation and delayed old callbacks cannot clear its owner', () => {
  const f = fixture();
  f.display.update(10, 10);
  for (const mana of [8, 6, 4, 2]) {
    f.display.update(mana, 10);
    assert.equal(f.activeCount(), 1);
  }
  assert.equal(f.animations.length, 4);
  assert.deepEqual(
    f.animations.map((animation) => animation.cancelled),
    [1, 1, 1, 0],
  );
  f.animations[0].oncancel?.();
  f.animations[1].onfinish?.();
  f.display.reset();
  assert.equal(f.animations[3].cancelled, 1, 'old completion cannot orphan the current animation');
  assert.equal(f.activeCount(), 0);
});

test('feedback disabled cancels motion, paints mana and consumes the silent baseline', () => {
  const f = fixture();
  f.display.update(10, 10);
  f.display.update(8, 10);
  f.display.update(4.5, 10, false);
  assert.equal(f.activeCount(), 0);
  assert.equal(f.animations.length, 1);
  assert.equal(f.amount.textContent, '4');
  assert.equal(f.track.attributes.get('aria-valuenow'), '4.50');
  f.display.update(4.5, 10, true);
  assert.equal(f.animations.length, 1, 'enabling does not replay the hidden spend');
  f.display.update(3, 10, true);
  assert.equal(f.animations.length, 2, 'a later real spend still animates');
  f.display.dispose();
});

test('reduced motion cancels an active pulse and enabling motion never replays prior changes', () => {
  const f = fixture();
  f.display.update(10, 10);
  f.display.update(8, 10);
  f.reduced(true);
  f.display.update(8, 10);
  assert.equal(f.activeCount(), 0);
  f.display.update(4, 10);
  assert.equal(f.animations.length, 1);
  assert.equal(f.amount.textContent, '4');
  f.reduced(false);
  f.display.update(4, 10);
  assert.equal(f.animations.length, 1);
  f.display.update(2, 10);
  assert.equal(f.animations.length, 2);
  f.display.dispose();
});

test('suspend and dispose cancel motion and make the next snapshot a quiet baseline', () => {
  const f = fixture();
  f.display.update(10, 10);
  f.display.update(8, 10);
  f.display.suspend();
  assert.equal(f.activeCount(), 0);
  f.display.update(1, 10);
  assert.equal(f.animations.length, 1, 'resumed state is not treated as a spend while disconnected');
  f.display.update(0, 10);
  assert.equal(f.animations.length, 2);
  f.display.dispose();
  f.display.dispose();
  assert.equal(f.animations[1].cancelled, 1);
  assert.equal(f.activeCount(), 0);
  f.display.update(0, 10);
  assert.equal(f.animations.length, 2);
});

test('updates preserve cells, clamp values and paint fractional progress and accessibility state', () => {
  const f = fixture();
  f.display.update(4.25, 10, false);
  assert.equal(f.track.attributes.get('role'), 'progressbar');
  assert.equal(f.track.attributes.get('aria-label'), 'Mana');
  assert.equal(f.track.attributes.get('aria-valuemin'), '0');
  assert.equal(f.track.attributes.get('aria-valuemax'), '10');
  assert.equal(f.track.attributes.get('aria-valuenow'), '4.25');
  assert.equal(f.track.style.values.get('--mana-slots'), '10');
  assert.equal(f.amount.dataset.max, '10');
  assert.equal(f.root.dataset.state, 'charging');
  assert.equal(f.track.children[3].classList.contains('filled'), true);
  assert.equal(f.track.children[4].classList.contains('filled'), false);
  assert.equal(f.track.children[4].classList.contains('filling'), true);
  assert.equal(f.track.children[4].style.values.get('--mana-fill'), '25%');
  const cells = [...f.track.children];
  f.display.update(50, 10, false);
  assert.equal(f.amount.textContent, '10');
  assert.equal(f.root.dataset.state, 'full');
  f.display.update(-4, 10, false);
  assert.equal(f.amount.textContent, '0');
  assert.equal(f.track.attributes.get('aria-valuenow'), '0.00');
  assert.ok(f.track.children.every((cell) => cell.style.values.get('--mana-fill') === '0%'));
  assert.deepEqual(f.track.children, cells);
  assert.equal(f.track.builds, 1);
  f.display.update(2, 6, false);
  assert.equal(f.track.children.length, 6);
  assert.equal(f.track.builds, 2);
  assert.equal(f.track.attributes.get('aria-valuemax'), '6');
  assert.equal(f.amount.dataset.max, '6');
  assert.equal(f.animations.length, 0);
  f.display.dispose();
});
