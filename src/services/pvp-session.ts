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
  private opening = false;
  private restoreRequest?: Promise<void>;
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
  private async enter(path: string, data: unknown) {
    if (this.leaving) throw new Error('Đang rời phòng.');
    if (this.restoring) throw new Error('Đang khôi phục phiên đấu.');
    if (this.opening) throw new Error('Yêu cầu phòng đang xử lý.');
    this.opening = true;
    const generation = this.generation;
    const signal = this.requests.signal;
    try {
      let packet: PvpPacket;
      try {
        packet = await api<PvpPacket>(path, 'POST', data, signal);
      } catch (error) {
        if (signal.aborted || generation !== this.generation || !this.transient(error)) throw error;
        // A mutation can succeed even when its response is lost. Discover membership,
        // rather than creating/joining another room or inventing a client result.
        const current = await api<PvpPacket | null>('/api/pvp/current', 'GET', undefined, signal);
        if (!current) throw error;
        packet = current;
      }
      if (generation !== this.generation) return;
      this.accept(packet);
      this.poll();
    } finally {
      if (generation === this.generation) this.opening = false;
    }
  }
  open(deck: string[], spells: SpellId[], code?: string, cards?: string[]) {
    return this.enter(`/api/pvp/${code ? 'join' : 'create'}`, { deck, spells, code, cards });
  }
  queue(mode: QueueMode, cards: string[], revision: number) {
    return this.enter('/api/pvp/queue', { mode, cards, revision, deck: [], spells: [] });
  }
  private transient(error: unknown) {
    return !(error instanceof ApiError) || error.status >= 500;
  }
  restore(): Promise<void> {
    if (this.leaving || this.opening || this.packet) return Promise.resolve();
    if (this.restoreRequest) return this.restoreRequest;
    clearTimeout(this.timer);
    const generation = this.generation;
    this.restoring = true;
    this.restoreRequest = this.restoreOnce(generation).finally(() => {
      if (generation === this.generation) this.restoreRequest = undefined;
    });
    return this.restoreRequest;
  }
  private async restoreOnce(generation: number) {
    let code: string | null = null;
    try {
      code = sessionStorage.getItem('kora-pvp-room');
    } catch {
      /* optional */
    }
    const signal = this.requests.signal;
    let retrying = false;
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
      this.restoring = false;
      if (!packet) {
        this.clearStoredRoom();
        this.setConnected(true);
        return;
      }
      this.accept(packet);
      this.poll();
    } catch (error) {
      if (generation !== this.generation || signal.aborted) return;
      if (error instanceof ApiError && [400, 401, 404].includes(error.status)) this.clearStoredRoom();
      if (this.transient(error)) {
        retrying = true;
        if (this.connected) this.onError('Đang nối lại phiên đấu…');
        this.setConnected(false);
        // Preserve the token and keep local play/new queues blocked until membership
        // is known. Disposal/leave owns the same timer and cancels this retry.
        this.timer = setTimeout(() => void this.restore(), 1500);
      } else this.setConnected(true);
    } finally {
      if (generation === this.generation && !retrying) this.restoring = false;
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
    const signal = this.requests.signal;
    // Store the pending operation before it can finish, including an empty local session.
    this.leaving = Promise.resolve().then(async () => {
      let confirmed = !code,
        retried = false;
      try {
        if (code) {
          try {
            await api('/api/pvp/leave', 'POST', { code }, signal);
          } catch (error) {
            if (signal.aborted || generation !== this.generation || !this.transient(error)) throw error;
            // The first request may have canceled the room already. Repeating the same
            // token can only leave that room; it must never cancel a newer membership.
            retried = true;
            await api('/api/pvp/leave', 'POST', { code }, signal);
          }
          confirmed = true;
        }
      } catch (error) {
        if (generation !== this.generation || signal.aborted) return;
        if (error instanceof ApiError && [400, 401, 404].includes(error.status)) {
          // Expired/deleted rooms and expired authentication cannot retain membership.
          confirmed = true;
          if (!retried || error.status === 401) this.onError(error.message);
        } else {
          this.setConnected(false);
          throw new Error('Chưa rời được phòng. Thử lại.');
        }
      } finally {
        if (generation === this.generation) {
          this.leaving = undefined;
          if (confirmed) this.forget();
          // Keep the packet/token until cancellation is known. The waiting screen
          // stays open, its retry button unlocks, and authoritative polling resumes.
          else if (!signal.aborted && this.packet) this.poll();
        }
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
    this.restoreRequest = undefined;
    this.opening = false;
    this.leaving = undefined;
  }
}
