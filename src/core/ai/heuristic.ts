import { LANES } from '../../data/index';
import type { Battle } from '../Battle';
import type { Side } from '../types';
import { isSpell, SPELLS } from '../../data/spells';
export function runAI(battle: Battle, side: Side = 1) {
  const dir = side === 0 ? 1 : -1;
  const lanes = LANES.map((_, lane) => {
    const threat = battle.units
      .filter((u) => u.side !== side && u.lane === lane && u.hp > 0)
      .reduce((n, u) => n + (u.hp / u.maxHp) * (1 + (dir === 1 ? -u.x : u.x) / 18), 0);
    const friends = battle.units.filter((u) => u.side === side && u.lane === lane && u.hp > 0).length;
    const tower = battle.towers.find((t) => t.side !== side && t.lane === lane)!;
    return { lane, score: threat * 1.8 - friends * 0.5 + (tower.hp <= 0 ? 0.7 : 0) + battle.random() * 1.4 };
  }).sort((a, b) => b.score - a.score);
  const lane = lanes[0].lane;
  if (battle.cycling) {
    for (const card of battle.hands[side]) {
      if (!battle.spellDecks[side].includes(card.id as never)) continue;
      const friendly = ['heal', 'shield', 'haste'].includes(card.id);
      const targets = battle.units.filter(
        (unit) => unit.hp > 0 && unit.lane === lane && (friendly ? unit.side === side : unit.side !== side),
      );
      const target = card.id === 'heal' ? targets.find((unit) => unit.maxHp - unit.hp >= 60) : targets[0];
      if (target && !battle.canCast(side, card.id, lane, target.x, card.uid)) {
        battle.cast(side, card.id, lane, target.x, card.uid);
        break;
      }
    }
    // Spending an empty-area spell is legal and prevents an all-spell hand from stalling the AI.
    if (battle.hands[side].every((card) => isSpell(card.id))) {
      const cycle = battle.hands[side]
        .filter((card) => !battle.canCast(side, card.id, lane, 0, card.uid))
        .sort(
          (a, b) => SPELLS[a.id as keyof typeof SPELLS].cost - SPELLS[b.id as keyof typeof SPELLS].cost,
        )[0];
      if (cycle) battle.cast(side, cycle.id, lane, 0, cycle.uid);
    }
  }
  if (battle.tactical && !battle.cycling) {
    const target = battle.units.find((u) => u.side !== side && u.hp > 0 && u.lane === lane);
    if (
      target &&
      battle.units.filter(
        (u) => u.side !== side && u.hp > 0 && u.lane === lane && Math.abs(u.x - target.x) < 2.5,
      ).length >= 2
    ) {
      const spell = battle.spellDecks[side].find((id) => !battle.canCast(side, id, lane, target.x));
      if (spell) battle.cast(side, spell, lane, target.x);
    }
  }
  if (
    battle.resonance[side] >= 100 &&
    battle.units.filter((u) => u.side !== side && u.lane === lane).length >= 2
  )
    battle.pulse(side, lane);
  const front = battle.units.some(
    (u) => u.side === side && u.lane === lane && battle.heroes[u.heroId].range < 2,
  );
  const affordable = battle.decks[side]
    .filter((id) => !battle.canPlay(side, id, lane))
    .map((id) => ({
      id,
      score:
        battle.random() +
        (front ? (battle.heroes[id].range > 2 ? 1 : 0) : battle.heroes[id].hp > 300 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  if (affordable.length) battle.play(side, affordable[0].id, lane);
}
