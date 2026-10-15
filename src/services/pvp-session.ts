import type { MatchMode, QueueMode, MatchOutcome } from '../data/competition';
import { api, ApiError } from './api';
import type { ContentConfig } from '../data/content';
import type { SpellId } from '../data/spells';
import type { OnlineState } from '../core/online-state';
import type { ReactionPacket } from '../data/communication';
export interface PvpPacket {
  code: string;
  mode?: MatchMode;
  revision?: number;
  queueSeconds?: number;
  outcome?: MatchOutcome;
  version: number;
  waiting: boolean;
  seed: number;
  content?: ContentConfig;
  loadout: { deck: string[]; spells: SpellId[]; cards?: string[] };
  opponent?: { deck: string[]; spells: SpellId[]; cards?: string[] };
  openingSeconds?: number;
  state?: OnlineState;
  error?: string | null;
  reactions?: ReactionPacket[];
}
export class PvpSession {
  packet?: PvpPacket;
  connected = true;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private sending = false;
  private leaving?: Promise<void>;
  private requests = new AbortController();
  restoring = false;
  onState: (packet: PvpPacket) => void = () => {};
  onError: (message: string) => void = () => {};
  onClosed: () => void = () => {};
  onConnectionChange: (connected: boolean) => void = () => {};
  private setConnected(connected: boolean) {
    if (this.connected === connected) return;
    this.connected = connected;
    this.onConnectionChange(connected);
  }
  get active() {
    return !!this.packet;
  }
  private accept(packet: PvpPacket) {
    if (this.packet && packet.code === this.packet.code && packet.version < this.packet.version) return;
    this.packet = { ...packet, content: packet.content || this.packet?.content };
    this.setConnected(true);
    try {
      sessionStorage.setItem('kora-pvp-room', packet.code);
    } catch {
      /* optional */
    }
    this.onState(this.packet);
  }
  async open(deck: string[], spells: SpellId[], code?: string, cards?: string[]) {
    if (this.leaving) throw new Error('Đang rời phòng.');
    const generation = this.generation;
    const packet = await api<PvpPacket>(
      `/api/pvp/${code ? 'join' : 'create'}`,
      'POST',
      {
        deck,
        spells,
        code,
        cards,
      },
      this.requests.signal,
    );
    if (generation !== this.generation) return;
    this.accept(packet);
    this.poll();
  }
  async queue(mode: QueueMode, cards: string[], revision: number) {
    if (this.leaving) throw new Error('Đang rời phòng.');
    const generation = this.generation;
    const packet = await api<PvpPacket>(
      '/api/pvp/queue',
      'POST',
      { mode, cards, revision, deck: [], spells: [] },
      this.requests.signal,
    );
    if (generation !== this.generation) return;
    this.accept(packet);
    this.poll();
  }
  async restore() {
    if (this.leaving) return;
    const generation = this.generation;
    let code: string | null = null;
    try {
      code = sessionStorage.getItem('kora-pvp-room');
    } catch {
      /* optional */
    }
    this.restoring = true;
    const signal = this.requests.signal;
    try {
      let packet: PvpPacket | null;
      try {
        packet = await api<PvpPacket | null>(
          code ? `/api/pvp/state?metadata=1&code=${encodeURIComponent(code)}` : '/api/pvp/current',
          'GET',
          undefined,
          signal,
        );
      } catch (error) {
        if (generation !== this.generation) return;
        if (!code || !(error instanceof ApiError) || ![400, 404].includes(error.status)) throw error;
        // A stale code from another tab must not hide a currently active room.
        this.clearStoredRoom();
        packet = await api<PvpPacket | null>('/api/pvp/current', 'GET', undefined, signal);
      }
      if (generation !== this.generation) return;
      if (!packet) return;
      this.accept(packet);
      this.poll();
    } catch (error) {
      if (
        generation === this.generation &&
        error instanceof ApiError &&
        [400, 401, 404].includes(error.status)
      )
        this.clearStoredRoom();
      // Network/server failures do not invalidate membership or the saved code.
    } finally {
      if (generation === this.generation) this.restoring = false;
    }
  }
  private poll() {
    clearTimeout(this.timer);
    const generation = this.generation;
    this.timer = setTimeout(
      async () => {
        if (!this.packet || generation !== this.generation) return;
        try {
          const packet = await api<PvpPacket>(
            `/api/pvp/state?code=${encodeURIComponent(this.packet.code)}`,
            'GET',
            undefined,
            this.requests.signal,
          );
          if (generation === this.generation) this.accept(packet);
        } catch (e) {
          if (generation !== this.generation) return;
          if (e instanceof ApiError && (e.status === 400 || e.status === 401)) {
            this.forget();
            this.onClosed();
            this.onError(e.message);
            return;
          }
          if (this.connected) this.onError('Mất kết nối. Đang thử lại…');
          this.setConnected(false);
        }
        if (generation === this.generation && this.packet?.state?.phase !== 'ended') this.poll();
      },
      this.connected ? 100 : 1500,
    );
  }
  async command(
    type: 'play' | 'spell' | 'pulse' | 'mulligan',
    card: string | undefined,
    lane: number,
    x: number,
    cardUid?: number,
    cards?: number[],
  ) {
    if (this.leaving) return 'Đang rời phòng.';
    if (!this.packet || this.sending || !this.connected) return 'Đang chờ kết nối máy chủ.';
    this.sending = true;
    const generation = this.generation;
    const signal = this.requests.signal;
    const data = {
      code: this.packet.code,
      command: { id: crypto.randomUUID(), type, card, lane, x, cardUid, cards },
    };
    try {
      let packet: PvpPacket;
      try {
        packet = await api<PvpPacket>('/api/pvp/command', 'POST', data, signal);
      } catch (error) {
        if (
          signal.aborted ||
          generation !== this.generation ||
          (error instanceof ApiError && error.status < 500)
        )
          throw error;
        // The server may have applied the first command before its response was lost.
        packet = await api<PvpPacket>('/api/pvp/command', 'POST', data, signal);
      }
      if (generation === this.generation) this.accept(packet);
      return packet.error || null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    } finally {
      if (generation === this.generation) this.sending = false;
    }
  }
  leave() {
    if (this.leaving) return this.leaving;
    const code = this.packet?.code;
    // In-flight polls/commands must not replace the menu or start a result while leaving.
    this.dispose();
    const generation = this.generation;
    // Store the pending operation before it can finish, including an empty local session.
    this.leaving = Promise.resolve().then(async () => {
      // Local navigation must still work if the room/server has disappeared.
      try {
        if (code) await api('/api/pvp/leave', 'POST', { code });
      } catch (e) {
        if (generation === this.generation) this.onError(e instanceof Error ? e.message : String(e));
      } finally {
        if (generation === this.generation) this.forget();
      }
    });
    return this.leaving;
  }
  async reaction(reactionId: string) {
    if (!this.packet || this.leaving || !this.connected) return 'Đang chờ kết nối máy chủ.';
    const generation = this.generation,
      signal = this.requests.signal,
      data = { code: this.packet.code, command: { id: crypto.randomUUID(), reactionId } };
    try {
      let packet: PvpPacket;
      try {
        packet = await api<PvpPacket>('/api/pvp/reaction', 'POST', data, signal);
      } catch (e) {
        if (signal.aborted || generation !== this.generation || (e instanceof ApiError && e.status < 500))
          throw e;
        packet = await api<PvpPacket>('/api/pvp/reaction', 'POST', data, signal);
      }
      if (generation === this.generation) this.accept(packet);
      return packet.error || null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }
  private forget() {
    this.dispose();
    this.packet = undefined;
    this.setConnected(true);
    this.clearStoredRoom();
  }
  private clearStoredRoom() {
    try {
      sessionStorage.removeItem('kora-pvp-room');
    } catch {
      /* optional */
    }
  }
  dispose() {
    ++this.generation;
    clearTimeout(this.timer);
    this.requests.abort();
    this.requests = new AbortController();
    this.sending = false;
    this.restoring = false;
    this.leaving = undefined;
  }
}
