import { randomBytes, randomInt } from 'node:crypto';
import type { ContentConfig } from '../src/data/content';
import { validateSpellDeck, type SpellId } from '../src/data/spells';
import { tacticalBattle } from '../src/core/tactical';
import { onlineState } from '../src/core/online-state';
import type { Battle } from '../src/core/Battle';
import type { Side } from '../src/core/types';
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
  constructor(private now = () => Date.now()) {}
  private validate(input: Loadout, content: ContentConfig) {
    if (!input || !Array.isArray(input.deck)) throw new Error('Đội hình không hợp lệ.');
    validateSpellDeck(input.spells);
    tacticalBattle(input.deck, input.spells, content, 1);
  }
  private advance(r: Room) {
    const b = r.battle;
    if (!b || b.phase !== 'playing') return;
    const target = Math.min(18000, Math.floor((this.now() - r.started) / 50));
    while (b.tick < target && b.phase === 'playing') b.step();
    // A disconnected opponent has 30 seconds to reconnect.
    if (b.phase === 'playing') {
      const missing = r.seen.map((t) => this.now() - t > 30000);
      if (missing[0] || missing[1]) {
        b.winner = missing[0] ? 1 : 0;
        b.phase = 'ended';
      }
    }
    if (b.phase === 'ended') r.finished = this.now();
  }
  private prune() {
    for (const [code, r] of this.rooms) {
      if (
        (!r.battle && this.now() - r.created > 600000) ||
        (r.finished && this.now() - r.finished > 300000) ||
        this.now() - Math.max(...r.seen) > 600000
      )
        this.rooms.delete(code);
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
    this.prune();
    for (const r of this.rooms.values()) {
      if (!r.players.includes(player)) continue;
      this.advance(r);
      if (!r.battle || r.battle.phase === 'playing') return this.state(player, r.code);
    }
    return null;
  }
  join(player: string, code: string, input: Loadout) {
    this.prune();
    const r = this.rooms.get(code);
    if (!r) throw new Error('Phòng không tồn tại hoặc đã hết hạn.');
    if (r.players.includes(player)) return this.state(player, code);
    if (r.players.length !== 1 || r.battle) throw new Error('Phòng đã đủ người.');
    for (const other of this.rooms.values())
      if (
        other !== r &&
        other.players.includes(player) &&
        (!other.battle || other.battle.phase === 'playing')
      )
        throw new Error('Bạn đang có phòng khác.');
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
    r.started = this.now();
    r.seen = [this.now(), this.now()];
    return this.state(player, code);
  }
  private member(player: string, code: string) {
    this.prune();
    const r = this.rooms.get(code),
      side = r?.players.indexOf(player);
    if (!r || side === undefined || side < 0) throw new Error('Không có quyền truy cập phòng.');
    return { r, side: side as Side };
  }
  state(player: string, code: string, metadata = true) {
    const { r, side } = this.member(player, code);
    this.advance(r);
    r.seen[side] = this.now();
    return {
      code,
      version: ++r.version,
      waiting: !r.battle,
      seed: r.seed,
      ...(metadata ? { content: r.content } : {}),
      loadout: r.loadouts[side],
      opponent: r.loadouts[1 - side],
      state: r.battle ? onlineState(r.battle, side) : undefined,
    };
  }
  command(player: string, code: string, c: PvpCommand) {
    const { r, side } = this.member(player, code);
    if (!c || typeof c.id !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(c.id))
      throw new Error('Mã lệnh không hợp lệ.');
    this.advance(r);
    r.seen[side] = this.now();
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
    const { r, side } = this.member(player, code);
    this.advance(r);
    if (!r.battle) this.rooms.delete(code);
    else if (r.battle.phase === 'playing') {
      r.battle.winner = (1 - side) as Side;
      r.battle.phase = 'ended';
      r.finished = this.now();
    }
    return { ok: true };
  }
}
