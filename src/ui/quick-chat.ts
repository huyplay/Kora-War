import { communicationOf, type CommunicationConfig, type ReactionPacket } from '../data/communication';
import type { ContentConfig } from '../data/content';
import { escapeHTML } from './dom';
import { icon } from './icons';
import './styles/quick-chat.css';
import { pageDeck } from './page-deck';

/** UI reactions never enter the deterministic command log or simulation state. */
export class QuickChat {
  private root = document.createElement('aside');
  private config: CommunicationConfig = communicationOf({});
  private muted = false;
  private room = '';
  private lastId = 0;
  private nextSend = 0;
  private sending = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private generation = 0;
  private pageCleanup: (() => void)[] = [];
  private cooldownTimer?: ReturnType<typeof setTimeout>;
  constructor(
    private context: {
      send: (id: string) => Promise<string | null>;
      online: () => boolean;
      notify: (s: string) => void;
      sound: () => void;
    },
  ) {
    try {
      this.muted = localStorage.getItem('kora-mute-reactions') === '1';
    } catch {
      /* optional */
    }
    this.root.className = 'quick-chat';
    this.root.hidden = true;
    document.querySelector('#app main')!.append(this.root);
  }
  configure(content: ContentConfig) {
    this.reset();
    this.config = communicationOf(content);
    this.render();
  }
  private render() {
    this.pageCleanup.splice(0).forEach((f) => f());
    this.root.innerHTML = `<button class="quick-chat-toggle" aria-label="Chat nhanh" aria-expanded="false">•••</button><button class="quick-chat-dismiss" hidden tabindex="-1" aria-label="Đóng chat nhanh bằng cách chạm ngoài"></button><section class="quick-chat-panel" hidden role="dialog" aria-modal="true" aria-label="Emoji và chat nhanh"><div class="quick-chat-bar"><nav class="screen-tabs" aria-label="Loại phản hồi"><button data-chat-tab="phrase" class="active" aria-pressed="true">Câu nhanh</button><button data-chat-tab="emoji" aria-pressed="false">Emoji</button></nav><button class="quick-chat-mute ${this.muted ? 'is-muted' : ''}" aria-label="Tắt phản hồi đối thủ" aria-pressed="${this.muted}">${icon('sound')}<span aria-hidden="true"></span></button><button class="quick-chat-close" aria-label="Đóng chat nhanh">${icon('close')}</button></div><div class="quick-chat-content"><section class="chat-page" data-chat-page="phrase"><div class="quick-phrases">${this.config.reactions
      .filter((r) => r.enabled && r.kind === 'phrase')
      .map((r) => `<button data-reaction="${escapeHTML(r.id)}">${escapeHTML(r.text)}</button>`)
      .join(
        '',
      )}</div></section><section class="chat-page" data-chat-page="emoji" hidden><div class="quick-emojis">${this.config.reactions
      .filter((r) => r.enabled && r.kind === 'emoji')
      .map(
        (r) =>
          `<button data-reaction="${escapeHTML(r.id)}" aria-label="${escapeHTML(r.label)}">${r.imageAssetId ? `<img src="/api/assets/${escapeHTML(r.imageAssetId)}" alt="" draggable="false">` : `<span>${escapeHTML(r.text)}</span>`}</button>`,
      )
      .join(
        '',
      )}</div></section></div></section><div class="reaction-bubble own" hidden aria-live="polite"></div><div class="reaction-bubble opponent" hidden aria-live="polite"></div>`;
    this.root.querySelectorAll<HTMLElement>('[data-chat-tab]').forEach(
      (button) =>
        (button.onclick = () => {
          this.root
            .querySelectorAll<HTMLElement>('[data-chat-page]')
            .forEach((page) => (page.hidden = page.dataset.chatPage !== button.dataset.chatTab));
          this.root.querySelectorAll<HTMLElement>('[data-chat-tab]').forEach((tab) => {
            tab.classList.toggle('active', tab === button);
            tab.setAttribute('aria-pressed', String(tab === button));
          });
        }),
    );
    for (const [selector, size, label] of [
      ['.quick-phrases', 6, 'Câu nhanh'],
      ['.quick-emojis', 8, 'Emoji'],
    ] as const)
      this.pageCleanup.push(pageDeck(this.root.querySelector<HTMLElement>(selector)!, size, label).dispose);
    const toggle = this.root.querySelector<HTMLButtonElement>('.quick-chat-toggle')!,
      panel = this.root.querySelector<HTMLElement>('.quick-chat-panel')!;
    toggle.setAttribute('aria-controls', 'quick-chat-panel');
    panel.id = 'quick-chat-panel';
    toggle.onclick = () => {
      if (!panel.hidden) this.closePanel();
      else {
        panel.hidden = false;
        this.root.querySelector<HTMLElement>('.quick-chat-dismiss')!.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        panel.querySelector<HTMLButtonElement>('[data-chat-tab].active')!.focus({ preventScroll: true });
      }
      this.context.sound();
    };
    this.root.querySelector<HTMLButtonElement>('.quick-chat-close')!.onclick = () => this.closePanel();
    this.root.querySelector<HTMLButtonElement>('.quick-chat-dismiss')!.onclick = (e) => {
      e.stopPropagation();
      this.closePanel();
    };
    const mute = this.root.querySelector<HTMLButtonElement>('.quick-chat-mute')!;
    mute.onclick = () => {
      this.muted = !this.muted;
      mute.setAttribute('aria-pressed', String(this.muted));
      mute.classList.toggle('is-muted', this.muted);
      if (this.muted) this.root.querySelector<HTMLElement>('.opponent')!.hidden = true;
      try {
        localStorage.setItem('kora-mute-reactions', this.muted ? '1' : '0');
      } catch {
        /* optional */
      }
    };
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-reaction]')
      .forEach((b) => (b.onclick = () => void this.send(b.dataset.reaction!)));
    this.root.onkeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePanel();
      } else if (e.key === 'Tab' && !panel.hidden) {
        const controls = Array.from(
          panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
        ).filter((b) => b.getClientRects().length > 0);
        const index = controls.indexOf(document.activeElement as HTMLButtonElement);
        if (e.shiftKey && index <= 0) {
          e.preventDefault();
          controls.at(-1)?.focus({ preventScroll: true });
        } else if (!e.shiftKey && (index < 0 || index === controls.length - 1)) {
          e.preventDefault();
          controls[0]?.focus({ preventScroll: true });
        }
      }
      e.stopPropagation();
    };
  }
  private closePanel(restoreFocus = true) {
    this.root
      .querySelectorAll<HTMLElement>('.quick-chat-panel,.quick-chat-dismiss')
      .forEach((el) => (el.hidden = true));
    const toggle = this.root.querySelector<HTMLButtonElement>('.quick-chat-toggle');
    toggle?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle?.focus({ preventScroll: true });
  }
  private updateSendState() {
    const cooling = performance.now() < this.nextSend;
    this.root.classList.toggle('is-cooling', cooling);
    this.root.classList.toggle('is-sending', this.sending);
    this.root.querySelector('.quick-chat-toggle')?.setAttribute('aria-busy', String(this.sending || cooling));
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-reaction]')
      .forEach((button) => (button.disabled = this.sending || cooling));
  }
  private async send(id: string) {
    if (this.sending || performance.now() < this.nextSend) return;
    const generation = this.generation;
    this.sending = true;
    this.updateSendState();
    this.closePanel();
    let error: string | null;
    try {
      error = this.context.online() ? await this.context.send(id) : null;
    } catch {
      error = 'Chưa gửi được phản hồi. Hãy thử lại.';
    }
    if (generation !== this.generation) return;
    this.sending = false;
    if (error) {
      this.updateSendState();
      this.context.notify(error);
      return;
    }
    this.nextSend = performance.now() + this.config.cooldownSeconds * 1000;
    this.root.style.setProperty('--reaction-cooldown', `${this.config.cooldownSeconds}s`);
    this.updateSendState();
    this.cooldownTimer = setTimeout(() => {
      this.nextSend = 0;
      this.cooldownTimer = undefined;
      this.updateSendState();
    }, this.config.cooldownSeconds * 1000);
    if (!this.context.online()) this.show(0, id, this.config.displaySeconds);
    this.context.sound();
  }
  receive(room: string, reactions: ReactionPacket[]) {
    if (this.room !== room) {
      this.reset();
      this.room = room;
    }
    for (const r of reactions) {
      if (r.id <= this.lastId) continue;
      this.lastId = r.id;
      if (r.side === 1 && this.muted) continue;
      this.show(r.side, r.reactionId, r.remainingSeconds);
    }
  }
  private show(side: 0 | 1, id: string, seconds: number) {
    const reaction = this.config.reactions.find((r) => r.id === id && r.enabled);
    if (!reaction || seconds <= 0) return;
    const bubble = this.root.querySelector<HTMLElement>(side ? '.opponent' : '.own')!;
    const token = String(++this.generationBubble);
    bubble.dataset.token = token;
    bubble.innerHTML = `<small>${side ? 'ĐỐI THỦ' : 'BẠN'}</small>${reaction.imageAssetId ? `<img src="/api/assets/${escapeHTML(reaction.imageAssetId)}" alt="${escapeHTML(reaction.label)}">` : `<span class="${reaction.kind}">${escapeHTML(reaction.text)}</span>`}`;
    bubble.hidden = false;
    const timer = setTimeout(
      () => {
        if (bubble.dataset.token === token) bubble.hidden = true;
        this.timers = this.timers.filter((t) => t !== timer);
      },
      Math.min(seconds, this.config.displaySeconds) * 1000,
    );
    this.timers.push(timer);
  }
  private generationBubble = 0;
  setVisible(visible: boolean) {
    this.root.hidden = !visible || !this.config.enabled;
    if (!visible) this.reset();
  }
  reset() {
    ++this.generation;
    this.sending = false;
    this.room = '';
    this.lastId = 0;
    this.nextSend = 0;
    clearTimeout(this.cooldownTimer);
    this.cooldownTimer = undefined;
    this.updateSendState();
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.root.querySelectorAll<HTMLElement>('.reaction-bubble').forEach((e) => (e.hidden = true));
    this.closePanel(false);
  }
  dispose() {
    this.pageCleanup.splice(0).forEach((f) => f());
    this.reset();
    this.root.remove();
  }
}
