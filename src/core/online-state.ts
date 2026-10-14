import type { Battle } from './Battle';
import type { Side } from './types';
/** Lossless render state. Never accepts client state as server combat input. */
export function onlineState(b: Battle, viewer: Side) {
  const sides = <T>(values: T[]) => (viewer === 0 ? values : [values[1], values[0]]);
  const side = (s: Side): Side => (viewer === 0 ? s : ((1 - s) as Side));
  const x = (v: number) => (viewer === 0 ? v : -v);
  return structuredClone({
    tick: b.tick,
    time: b.time,
    phase: b.phase,
    winner: b.winner === null ? null : side(b.winner),
    mana: sides(b.mana),
    cores: sides(b.cores),
    resonance: sides(b.resonance),
    stats: sides(b.stats),
    cooldowns: sides(b.cooldowns),
    units: b.units.map((u) => ({ ...u, side: side(u.side), x: x(u.x), previousX: x(u.previousX) })),
    towers: b.towers.map((t) => ({ ...t, id: `${side(t.side)}-${t.lane}`, side: side(t.side), x: x(t.x) })),
    events: b.events.map((e) => ({
      ...e,
      side: side(e.side),
      x: x(e.x),
      ...(e.toX === undefined ? {} : { toX: x(e.toX) }),
    })),
    spellZones: b.spellZones.map((z) => ({ ...z, side: side(z.side), x: x(z.x) })),
    ...(b.cycling
      ? {
          hands: [b.hands[viewer], []],
          cardDrawInfo: [b.cardDrawInfo[viewer], { remaining: 0, discarded: 0, cycle: 0 }],
          mulliganDone: sides(b.mulliganDone),
          opponentHandCount: b.hands[1 - viewer].length,
        }
      : {}),
  });
}
export type OnlineState = ReturnType<typeof onlineState>;
