import type { SoundCue } from '../data/media';

export interface HandPresentationCard {
  uid: number;
  id: string;
  cost: number;
  remaining: number;
  cooldown: number;
}
/** Snapshot-derived readiness; tracking is per physical card UID, never per hero type. */
export class HandReadiness {
  private ready = new Map<number, boolean>();
  waiting?: number;
  unavailable(uid: number) {
    return this.ready.get(uid) === false;
  }
  update(cards: readonly HandPresentationCard[], mana: number) {
    const live = new Set(cards.map((c) => c.uid));
    for (const uid of this.ready.keys()) if (!live.has(uid)) this.ready.delete(uid);
    if (this.waiting !== undefined && !live.has(this.waiting)) this.waiting = undefined;
    const result = cards.map((card) => {
      const ready = mana >= card.cost && card.remaining <= 0;
      const arrived = this.ready.get(card.uid) === false && ready;
      this.ready.set(card.uid, ready);
      return {
        ...card,
        ready,
        arrived,
        fill: Math.min(
          card.cost > 0 ? Math.max(0, mana / card.cost) : 1,
          card.cooldown > 0 ? Math.max(0, 1 - card.remaining / card.cooldown) : 1,
        ),
      };
    });
    return result;
  }
  reset() {
    this.ready.clear();
    this.waiting = undefined;
  }
}

/** Persistent hand nodes, bounded compositor animations and no extra draw timers. */
export class HandFeedback {
  private readiness = new HandReadiness();
  private animations = new Map<HTMLElement, Animation>();
  private playing = false;
  private quietNext = true;
  constructor(
    private hand: HTMLElement,
    private pile: HTMLElement,
    private sound: (cue: SoundCue) => void,
    private reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {}
  reconcile(
    cards: readonly { uid: number; id: string }[],
    render: (id: string, index: number) => string,
    bind: (button: HTMLButtonElement) => void,
    animate: boolean,
  ) {
    const old = new Map(
      Array.from(this.hand.children).map((el) => [
        Number((el as HTMLElement).dataset.cardUid),
        el as HTMLButtonElement,
      ]),
    );
    const incoming: HTMLButtonElement[] = [];
    const live = new Set(cards.map((c) => c.uid));
    for (const [uid, el] of old)
      if (!live.has(uid)) {
        this.cancelAnimation(el);
        el.remove();
      }
    for (const [index, card] of cards.entries()) {
      let button = old.get(card.uid);
      if (!button || button.dataset.hero !== card.id) {
        if (button) this.cancelAnimation(button);
        button?.remove();
        const template = document.createElement('template');
        template.innerHTML = render(card.id, index);
        button = template.content.firstElementChild as HTMLButtonElement;
        button.dataset.cardUid = String(card.uid);
        bind(button);
        incoming.push(button);
      }
      const current = this.hand.children[index];
      if (current !== button) this.hand.insertBefore(button, current ?? null);
      const shortcut = button.querySelector('kbd');
      if (shortcut) shortcut.textContent = String(index + 1);
    }
    // Initial hands and reconnect snapshots stay quiet; a consumed slot alone animates in combat.
    if (animate && this.playing && !this.quietNext && old.size && incoming.length) {
      const source = this.pile.getBoundingClientRect();
      for (const button of incoming) {
        if (this.reduced()) continue;
        const target = button.getBoundingClientRect();
        const x = source.left + source.width / 2 - target.left - target.width / 2;
        const y = source.top + source.height / 2 - target.top - target.height / 2;
        this.animate(
          button,
          [
            { transform: `translate(${x}px,${y}px) scale(.38) rotateY(-70deg)`, opacity: 0 },
            { transform: 'translate(0,-5px) scale(1.04) rotateY(0deg)', opacity: 1, offset: 0.78 },
            { transform: 'none', opacity: 1 },
          ],
          340,
        );
      }
      this.sound('card-draw');
      this.animate(
        this.pile,
        [{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }],
        180,
      );
    }
  }
  update(cards: readonly HandPresentationCard[], mana: number, playing: boolean) {
    const quiet = this.quietNext;
    this.playing = playing;
    this.refreshMotion();
    this.hand.classList.toggle('hand-paused', !playing);
    for (const animation of this.animations.values()) {
      if (playing && animation.playState === 'paused') animation.play();
      else if (!playing && animation.playState === 'running') animation.pause();
    }
    let readyCue = false;
    for (const card of this.readiness.update(cards, mana)) {
      if (card.ready && this.readiness.waiting === card.uid) this.readiness.waiting = undefined;
      const element = this.element(card.uid);
      if (!element) continue;
      element.classList.toggle('unaffordable', !card.ready);
      element.classList.toggle('waiting-card', this.readiness.waiting === card.uid && !card.ready);
      element.style.setProperty('--wait-fill', `${card.fill * 100}%`);
      element.style.setProperty(
        '--cooldown',
        `${card.cooldown > 0 ? Math.max(0, card.remaining / card.cooldown) * 100 : 0}%`,
      );
      element.setAttribute('aria-disabled', String(!card.ready));
      if (card.arrived && playing && !quiet) {
        readyCue = true;
        this.animate(
          element,
          [{ filter: 'brightness(1)' }, { filter: 'brightness(1.65)' }, { filter: 'brightness(1)' }],
          320,
        );
      }
    }
    if (playing) this.quietNext = false;
    if (readyCue) this.sound('card-ready');
  }
  wait(uid: number) {
    if (!this.playing || !this.readiness.unavailable(uid)) return;
    const element = this.element(uid);
    if (!element) return;
    this.readiness.waiting = uid;
    element.classList.add('waiting-card');
    this.sound('card-wait');
    this.animate(
      element,
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'none' }],
      160,
    );
  }
  private element(uid: number) {
    return this.hand.querySelector<HTMLElement>(`[data-card-uid="${uid}"]`);
  }
  private animate(element: HTMLElement | null, frames: Keyframe[], duration: number) {
    if (!element || this.reduced()) return;
    this.cancelAnimation(element);
    if (this.animations.size >= 16) {
      this.cancelAnimation(this.animations.keys().next().value!);
    }
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.2,.75,.25,1)' });
    this.animations.set(element, animation);
    const release = () => {
      if (this.animations.get(element) === animation) this.animations.delete(element);
    };
    animation.onfinish = animation.oncancel = release;
    if (!this.playing) animation.pause();
  }
  private cancelAnimation(element: HTMLElement) {
    const animation = this.animations.get(element);
    this.animations.delete(element);
    animation?.cancel();
  }
  private cancelAnimations() {
    for (const element of this.animations.keys()) this.cancelAnimation(element);
    this.animations.clear();
  }
  refreshMotion() {
    if (this.reduced()) this.cancelAnimations();
  }
  /** A new authoritative baseline must not replay draws/readiness missed offscreen. */
  resync() {
    this.cancelAnimations();
    this.readiness.reset();
    this.quietNext = true;
    for (const element of Array.from(this.hand.children)) element.classList.remove('waiting-card');
  }
  suspend() {
    this.playing = false;
    this.hand.classList.add('hand-paused');
    this.resync();
  }
  reset() {
    this.suspend();
    this.hand.replaceChildren();
  }
  dispose() {
    this.reset();
  }
}
