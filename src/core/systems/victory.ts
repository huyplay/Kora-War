import { STEP } from '../../data/index';
import type { Battle } from '../Battle';
export function updateVictory(battle: Battle) {
  if (battle.time >= battle.content.rules.overtimeAt) {
    const decay =
      (battle.content.rules.overtimeBaseDamage +
        (battle.time - battle.content.rules.overtimeAt) * battle.content.rules.overtimeAcceleration) *
      STEP;
    battle.cores = battle.cores.map((v) => Math.max(0, v - decay));
  }
  const timedOut = battle.cycling && battle.time >= battle.gameplay.match.maximumSeconds;
  if (battle.cores.some((v) => v <= 0) || timedOut) {
    if (timedOut && !battle.cores.some((v) => v <= 0) && battle.cores[0] !== battle.cores[1])
      battle.winner = battle.cores[0] > battle.cores[1] ? 0 : 1;
    else if (battle.cores[0] <= 0 && battle.cores[1] <= 0)
      battle.winner =
        battle.stats[0].damage === battle.stats[1].damage
          ? battle.gameplay.match.tieBreak === 'damage-player0'
            ? 0
            : battle.random() < 0.5
              ? 0
              : 1
          : battle.stats[0].damage > battle.stats[1].damage
            ? 0
            : 1;
    else if (timedOut)
      battle.winner =
        battle.stats[0].damage === battle.stats[1].damage
          ? battle.gameplay.match.tieBreak === 'damage-player0'
            ? 0
            : battle.random() < 0.5
              ? 0
              : 1
          : battle.stats[0].damage > battle.stats[1].damage
            ? 0
            : 1;
    else battle.winner = battle.cores[1] <= 0 ? 0 : 1;
    battle.phase = 'ended';
    battle.emit({ type: 'finish', side: battle.winner, lane: 1, x: 0 });
  }
}
