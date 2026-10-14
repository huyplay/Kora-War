import { communicationOf, type CommunicationConfig, type ReactionPacket } from '../data/communication';
import type { ContentConfig } from '../data/content';
import { escapeHTML } from './dom';
import './styles/quick-chat.css';

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
    this.config = communicationOf(content);
    this.render();
  }
  private render() {
    this.root.innerHTML = `<button class="quick-chat-toggle" aria-label="Chat nhanh" aria-expanded="false">•••</button><section class="quick-chat-panel" hidden aria-label="Emoji và chat nhanh"><div class="quick-chat-title"><strong>PHẢN HỒI NHANH</strong><button class="quick-chat-close" aria-label="Đóng chat nhanh">×</button></div><label class="quick-chat-mute"><input type="checkbox" ${this.muted ? 'checked' : ''}>Tắt phản hồi đối thủ</label><div class="quick-chat-content"><div class="quick-phrases">${this.config.reactions
      .filter((r) => r.enabled && r.kind === 'phrase')
      .map((r) => `<button data-reaction="${escapeHTML(r.id)}">${escapeHTML(r.text)}</button>`)
      .join('')}</div><div class="quick-emojis">${this.config.reactions
      .filter((r) => r.enabled && r.kind === 'emoji')
      .map(
        (r) =>
          `<button data-reaction="${escapeHTML(r.id)}" aria-label="${escapeHTML(r.label)}" title="${escapeHTML(r.label)}">${r.imageAssetId ? `<img src="/api/assets/${escapeHTML(r.imageAssetId)}" alt="${escapeHTML(r.label)}">` : `<span>${escapeHTML(r.text)}</span>`}</button>`,
      )
      .join(
        '',
      )}</div></div><small>${this.context.online() ? 'Phản hồi gửi tới đối thủ' : 'Phản hồi luyện tập · chỉ bạn thấy'}</small></section><div class="reaction-bubble own" hidden aria-live="polite"></div><div class="reaction-bubble opponent" hidden aria-live="polite"></div>`;
    const toggle = this.root.querySelector<HTMLButtonElement>('.quick-chat-toggle')!,
      panel = this.root.querySelector<HTMLElement>('.quick-chat-panel')!;
    toggle.onclick = () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
      this.context.sound();
    };
    this.root.querySelector<HTMLButtonElement>('.quick-chat-close')!.onclick = () => {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    };
    this.root.querySelector<HTMLInputElement>('input')!.onchange = (e) => {
      this.muted = (e.target as HTMLInputElement).checked;
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
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
      e.stopPropagation();
    };
  }
  private async send(id: string) {
    if (this.sending || performance.now() < this.nextSend) {
      this.context.notify('Chờ một nhịp trước khi gửi tiếp.');
      return;
    }
    const generation = this.generation;
    this.sending = true;
    const panel = this.root.querySelector<HTMLElement>('.quick-chat-panel')!;
    panel.hidden = true;
    this.root.querySelector('.quick-chat-toggle')!.setAttribute('aria-expanded', 'false');
    const error = this.context.online() ? await this.context.send(id) : null;
    if (generation !== this.generation) return;
    this.sending = false;
    if (error) {
      this.context.notify(error);
      return;
    }
    this.nextSend = performance.now() + this.config.cooldownSeconds * 1000;
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
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.root
      .querySelectorAll<HTMLElement>('.reaction-bubble,.quick-chat-panel')
      .forEach((e) => (e.hidden = true));
    this.root.querySelector('.quick-chat-toggle')?.setAttribute('aria-expanded', 'false');
  }
  dispose() {
    this.reset();
    this.root.remove();
  }
}
