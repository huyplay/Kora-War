import { STEP } from '../../data/index';
import type { Battle } from '../Battle';
export function updateMana(battle: Battle) {
  for (const side of [0, 1] as const) {
    battle.mana[side] = Math.min(
      battle.content.rules.maxMana,
      battle.mana[side] + STEP * battle.content.rules.manaPerSecond * battle.buff(side, undefined, 'mana', 1),
    );
    battle.resonance[side] = Math.min(
      battle.gameplay.resonance.cap,
      battle.resonance[side] + STEP * battle.gameplay.resonance.passive,
    );
  }
}
