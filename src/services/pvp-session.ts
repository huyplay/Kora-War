import { api, ApiError } from './api';
import type { ContentConfig } from '../data/content';
import type { SpellId } from '../data/spells';
import type { OnlineState } from '../core/online-state';
export interface PvpPacket {
  code: string;
  version: number;
  waiting: boolean;
  seed: number;
  content?: ContentConfig;
  loadout: { deck: string[]; spells: SpellId[] };
  opponent?: { deck: string[]; spells: SpellId[] };
  state?: OnlineState;
  error?: string | null;
}
export class PvpSession {
  packet?: PvpPacket;
  connected = true;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private sending = false;
  restoring = false;
  onState: (packet: PvpPacket) => void = () => {};
  onError: (message: string) => void = () => {};
  onClosed: () => void = () => {};
  get active() {
    return !!this.packet;
  }
  private accept(packet: PvpPacket) {
    if (this.packet && packet.code === this.packet.code && packet.version < this.packet.version) return;
    this.packet = { ...packet, content: packet.content || this.packet?.content };
    this.connected = true;
    try {
      sessionStorage.setItem('kora-pvp-room', packet.code);
    } catch {
      /* optional */
    }
    this.onState(this.packet);
  }
  async open(deck: string[], spells: SpellId[], code?: string) {
    const generation = this.generation;
    const packet = await api<PvpPacket>(`/api/pvp/${code ? 'join' : 'create'}`, 'POST', {
      deck,
      spells,
      code,
    });
    if (generation !== this.generation) return;
    this.accept(packet);
    this.poll();
  }
  async restore() {
    const generation = this.generation;
    let code: string | null = null;
    try {
      code = sessionStorage.getItem('kora-pvp-room');
    } catch {
      /* optional */
    }
    this.restoring = true;
    try {
      const packet = await api<PvpPacket | null>(
        code ? `/api/pvp/state?metadata=1&code=${encodeURIComponent(code)}` : '/api/pvp/current',
      );
      if (generation !== this.generation) return;
      if (!packet) return;
      this.accept(packet);
      this.poll();
    } catch {
      try {
        sessionStorage.removeItem('kora-pvp-room');
      } catch {
        /* optional */
      }
    } finally {
      this.restoring = false;
    }
  }
  private poll() {
    clearTimeout(this.timer);
    const generation = this.generation;
    this.timer = setTimeout(
      async () => {
        if (!this.packet || generation !== this.generation) return;
        try {
          const packet = await api<PvpPacket>(`/api/pvp/state?code=${encodeURIComponent(this.packet.code)}`);
          if (generation === this.generation) this.accept(packet);
        } catch (e) {
          if (generation !== this.generation) return;
          if (e instanceof ApiError && (e.status === 400 || e.status === 401)) {
            this.forget();
            this.onClosed();
            this.onError(e.message);
            return;
          }
          if (this.connected)
            this.onError(`Mất kết nối. Đang thử lại · ${e instanceof Error ? e.message : e}`);
          this.connected = false;
        }
        if (generation === this.generation && this.packet?.state?.phase !== 'ended') this.poll();
      },
      this.connected ? 100 : 1500,
    );
  }
  async command(type: 'play' | 'spell' | 'pulse', card: string | undefined, lane: number, x: number) {
    if (!this.packet || this.sending || !this.connected) return 'Đang chờ kết nối máy chủ.';
    this.sending = true;
    const generation = this.generation;
    try {
      const packet = await api<PvpPacket>('/api/pvp/command', 'POST', {
        code: this.packet.code,
        command: { id: crypto.randomUUID(), type, card, lane, x },
      });
      if (generation === this.generation) this.accept(packet);
      return packet.error || null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    } finally {
      this.sending = false;
    }
  }
  async leave() {
    const code = this.packet?.code;
    // In-flight polls/commands must not replace the menu or start a result while leaving.
    this.dispose();
    // Local navigation must still work if the room/server has disappeared.
    try {
      if (code) await api('/api/pvp/leave', 'POST', { code });
    } catch (e) {
      this.onError(e instanceof Error ? e.message : String(e));
    } finally {
      this.forget();
    }
  }
  private forget() {
    this.dispose();
    this.packet = undefined;
    try {
      sessionStorage.removeItem('kora-pvp-room');
    } catch {
      /* optional */
    }
  }
  dispose() {
    ++this.generation;
    clearTimeout(this.timer);
  }
}
