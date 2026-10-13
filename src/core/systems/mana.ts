import { RULES, STEP } from '../../data/index';
import type { Battle } from '../Battle';
export function updateMana(battle: Battle) {
    for (const side of [0, 1] as const) {
        battle.mana[side] = Math.min(RULES.maxMana, battle.mana[side] + STEP * RULES.manaPerSecond * (battle.has(side, 'storm') ? 1.2 : 1));
        battle.resonance[side] = Math.min(100, battle.resonance[side] + STEP * .75);
    }
}
