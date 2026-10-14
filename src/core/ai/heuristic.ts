import { LANES } from '../../data/index';
import type { Battle } from '../Battle';
import type { Side } from '../types';
import { isSpell, SPELLS } from '../../data/spells';
export function runAI(battle: Battle, side: Side = 1) {
  const dir = side === 0 ? 1 : -1;
  const ai = battle.gameplay.ai;
  const lanes = LANES.map((_, lane) => {
    const threat = battle.units
      .filter((u) => u.side !== side && u.lane === lane && u.hp > 0)
      .reduce((n, u) => n + (u.hp / u.maxHp) * (1 + (dir === 1 ? -u.x : u.x) / ai.threatDistance), 0);
    const friends = battle.units.filter((u) => u.side === side && u.lane === lane && u.hp > 0).length;
    const tower = battle.towers.find((t) => t.side !== side && t.lane === lane)!;
    return {
      lane,
      score:
        threat * ai.threatWeight -
        friends * ai.friendlyWeight +
        (tower.hp <= 0 ? ai.destroyedTowerBonus : 0) +
        battle.random() * ai.laneRandom,
    };
  }).sort((a, b) => b.score - a.score);
  const lane = lanes[0].lane;
  if (battle.cycling) {
    for (const card of battle.hands[side]) {
      if (!battle.spellDecks[side].includes(card.id as never)) continue;
      const spell = battle.gameplay.spells[card.id as keyof typeof SPELLS];
      const targets = battle.units.filter(
        (unit) =>
          unit.hp > 0 &&
          unit.lane === lane &&
          (spell.target === 'all' || (spell.target === 'ally' ? unit.side === side : unit.side !== side)),
      );
      const target = spell.effects.some((e) => e.kind === 'heal')
        ? targets.find((unit) => unit.maxHp - unit.hp >= ai.healMissingHp)
        : targets[0];
      if (target && !battle.canCast(side, card.id, lane, target.x, card.uid)) {
        battle.cast(side, card.id, lane, target.x, card.uid);
        break;
      }
    }
    // Spending an empty-area spell is legal and prevents an all-spell hand from stalling the AI.
    if (
      ai.cycleEmptySpells &&
      battle.hands[side].length &&
      battle.hands[side].every((card) => isSpell(card.id))
    ) {
      const cycle = battle.hands[side]
        .filter((card) => !battle.canCast(side, card.id, lane, 0, card.uid))
        .sort(
          (a, b) =>
            battle.gameplay.spells[a.id as keyof typeof SPELLS].cost -
            battle.gameplay.spells[b.id as keyof typeof SPELLS].cost,
        )[0];
      if (cycle) battle.cast(side, cycle.id, lane, 0, cycle.uid);
    }
  }
  if (battle.tactical && !battle.cycling) {
    const target = battle.units.find((u) => u.side !== side && u.hp > 0 && u.lane === lane);
    if (
      target &&
      battle.units.filter(
        (u) =>
          u.side !== side && u.hp > 0 && u.lane === lane && Math.abs(u.x - target.x) < ai.spellClusterRadius,
      ).length >= ai.spellClusterSize
    ) {
      const spell = battle.spellDecks[side].find((id) => !battle.canCast(side, id, lane, target.x));
      if (spell) battle.cast(side, spell, lane, target.x);
    }
  }
  if (
    battle.resonance[side] >= battle.gameplay.resonance.cap &&
    battle.units.filter((u) => u.side !== side && u.lane === lane).length >= ai.pulseEnemies
  )
    battle.pulse(side, lane);
  const front = battle.units.some(
    (u) => u.side === side && u.lane === lane && battle.heroes[u.heroId].range < ai.meleeRange,
  );
  const affordable = battle.decks[side]
    .filter((id) => !battle.canPlay(side, id, lane))
    .map((id) => ({
      id,
      score:
        battle.random() * ai.cardRandom +
        (front
          ? battle.heroes[id].range > ai.meleeRange
            ? ai.formationBonus
            : 0
          : battle.heroes[id].hp > ai.formationHp
            ? ai.formationBonus
            : 0),
    }))
    .sort((a, b) => b.score - a.score);
  if (affordable.length) battle.play(side, affordable[0].id, lane);
}
