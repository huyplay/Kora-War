import { randomBytes, randomInt } from 'node:crypto';
import type { ContentConfig } from '../src/data/content';
import { validateSpellDeck, type SpellId } from '../src/data/spells';
import { tacticalBattle } from '../src/core/tactical';
import { onlineState } from '../src/core/online-state';
import type { Battle } from '../src/core/Battle';
import type { Side } from '../src/core/types';
const RECONNECT_GRACE = 30000;
const WAITING_TTL = 600000;
const FINISHED_TTL = 300000;
export interface Loadout {
  deck: string[];
  spells: SpellId[];
}
export interface PvpCommand {
  id: string;
  type: 'play' | 'spell' | 'pulse';
  card?: string;
  lane: number;
  x: number;
}
interface Room {
  code: string;
  players: string[];
  loadouts: Loadout[];
  content: ContentConfig;
  seed: number;
  battle?: Battle;
  created: number;
  started: number;
  seen: number[];
  finished?: number;
  replies: Map<string, string | null>[];
  version: number;
}
/** Single-process authoritative MVP. Rooms expire; no persistent ranked/rewards. */
export class PvpRooms {
  private rooms = new Map<string, Room>();
  // Room lifetimes use elapsed time, so changing the system clock cannot pause a match.
  constructor(private now = () => performance.now()) {}
  private validate(input: Loadout, content: ContentConfig) {
    if (!input || !Array.isArray(input.deck)) throw new Error('Đội hình không hợp lệ.');
    validateSpellDeck(input.spells);
    tacticalBattle(input.deck, input.spells, content, 1);
  }
  private advance(r: Room, at = this.now()) {
    const b = r.battle;
    if (!b || b.phase !== 'playing') return;
    const disconnected = r.seen[0] <= r.seen[1] ? 0 : 1;
    const deadline = r.seen[disconnected] + RECONNECT_GRACE;
    const timedOut = at > deadline;
    // Resolve in chronological order: combat must not run past a disconnect deadline.
    const target = Math.min(18000, Math.floor((Math.min(at, deadline) - r.started) / 50));
    while (b.tick < target && b.phase === 'playing') b.step();
    if (b.phase !== 'playing') {
      r.finished = r.started + b.tick * 50;
    } else if (timedOut) {
      b.winner = (1 - disconnected) as Side;
      b.phase = 'ended';
      r.finished = deadline;
    }
  }
  private expired(r: Room, at: number) {
    return (
      (!r.battle && at - r.created > WAITING_TTL) ||
      (r.finished !== undefined && at - r.finished > FINISHED_TTL) ||
      at - Math.max(...r.seen) > WAITING_TTL
    );
  }
  private prune(at = this.now()) {
    for (const [code, r] of this.rooms) {
      // A room can finish while nobody polls it; reclaim it from its real deadline.
      if (r.battle?.phase === 'playing' && at - Math.min(...r.seen) > RECONNECT_GRACE + FINISHED_TTL)
        this.advance(r, at);
      if (this.expired(r, at)) this.rooms.delete(code);
    }
  }
  create(player: string, input: Loadout, content: ContentConfig) {
    this.prune();
    this.validate(input, content);
    const current = this.current(player);
    if (current) return current;
    if (this.rooms.size >= 200) throw new Error('Máy chủ đầy phòng. Thử lại sau.');
    const code = randomBytes(6).toString('hex').toUpperCase();
    this.rooms.set(code, {
      code,
      players: [player],
      loadouts: [{ deck: input.deck.slice(), spells: input.spells.slice() }],
      content: structuredClone(content),
      seed: randomInt(1, 0x7fffffff),
      created: this.now(),
      started: 0,
      seen: [this.now()],
      replies: [new Map(), new Map()],
      version: 0,
    });
    return this.state(player, code);
  }
  current(player: string) {
    const at = this.now();
    this.prune(at);
    for (const r of this.rooms.values()) {
      if (!r.players.includes(player)) continue;
      this.advance(r, at);
      if (this.expired(r, at)) {
        this.rooms.delete(r.code);
        continue;
      }
      if (!r.battle || r.battle.phase === 'playing') return this.state(player, r.code);
    }
    return null;
  }
  join(player: string, code: string, input: Loadout) {
    const at = this.now();
    this.prune(at);
    const r = this.rooms.get(code);
    if (!r) throw new Error('Phòng không tồn tại hoặc đã hết hạn.');
    if (r.players.includes(player)) return this.state(player, code);
    if (r.players.length !== 1 || r.battle) throw new Error('Phòng đã đủ người.');
    for (const other of this.rooms.values()) {
      if (other === r || !other.players.includes(player)) continue;
      this.advance(other, at);
      if (this.expired(other, at)) {
        this.rooms.delete(other.code);
        continue;
      }
      if (!other.battle || other.battle.phase === 'playing') throw new Error('Bạn đang có phòng khác.');
    }
    this.validate(input, r.content);
    r.players.push(player);
    r.loadouts.push({ deck: input.deck.slice(), spells: input.spells.slice() });
    r.battle = tacticalBattle(
      r.loadouts[0].deck,
      r.loadouts[0].spells,
      r.content,
      r.seed,
      input.deck,
      input.spells,
    );
    r.battle.aiEnabled = false;
    r.battle.start();
    r.started = at;
    r.seen = [at, at];
    return this.state(player, code);
  }
  private member(player: string, code: string, at = this.now()) {
    this.prune(at);
    const r = this.rooms.get(code),
      side = r?.players.indexOf(player);
    if (!r || side === undefined || side < 0) throw new Error('Không có quyền truy cập phòng.');
    this.advance(r, at);
    if (this.expired(r, at)) {
      this.rooms.delete(code);
      throw new Error('Không có quyền truy cập phòng.');
    }
    return { r, side: side as Side };
  }
  state(player: string, code: string, metadata = true) {
    const at = this.now();
    const { r, side } = this.member(player, code, at);
    r.seen[side] = at;
    return {
      code,
      version: ++r.version,
      waiting: !r.battle,
      seed: r.seed,
      ...(metadata ? { content: structuredClone(r.content) } : {}),
      loadout: structuredClone(r.loadouts[side]),
      opponent: structuredClone(r.loadouts[1 - side]),
      state: r.battle ? onlineState(r.battle, side) : undefined,
    };
  }
  command(player: string, code: string, c: PvpCommand) {
    const at = this.now();
    const { r, side } = this.member(player, code, at);
    if (!c || typeof c.id !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(c.id))
      throw new Error('Mã lệnh không hợp lệ.');
    r.seen[side] = at;
    const replies = r.replies[side];
    if (replies.has(c.id)) return { error: replies.get(c.id), ...this.state(player, code) };
    if (replies.size >= 2048) throw new Error('Đã vượt giới hạn lệnh của trận.');
    if (!r.battle || r.battle.phase !== 'playing') throw new Error('Trận chưa sẵn sàng hoặc đã kết thúc.');
    if (
      !['play', 'spell', 'pulse'].includes(c.type) ||
      !Number.isInteger(c.lane) ||
      c.lane < 0 ||
      c.lane > 2 ||
      !Number.isFinite(c.x) ||
      (c.type !== 'pulse' && typeof c.card !== 'string')
    )
      throw new Error('Lệnh không hợp lệ.');
    const x = side === 0 ? c.x : -c.x;
    const error =
      c.type === 'spell'
        ? r.battle.cast(side, c.card!, c.lane, x)
        : c.type === 'play'
          ? r.battle.play(side, c.card!, c.lane, x)
          : r.battle.pulse(side, c.lane);
    replies.set(c.id, error);
    return { error, ...this.state(player, code) };
  }
  leave(player: string, code: string) {
    const at = this.now();
    const { r, side } = this.member(player, code, at);
    if (!r.battle) this.rooms.delete(code);
    else if (r.battle.phase === 'playing') {
      r.battle.winner = (1 - side) as Side;
      r.battle.phase = 'ended';
      r.finished = at;
    }
    return { ok: true };
  }
}
