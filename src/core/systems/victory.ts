import { RULES, STEP } from '../../data/index';
import type { Battle } from '../Battle';
export function updateVictory(battle: Battle) {
    if (battle.time >= RULES.overtimeAt) {
        const decay = (RULES.overtimeBaseDamage + (battle.time - RULES.overtimeAt) * RULES.overtimeAcceleration) * STEP;
        battle.cores = battle.cores.map(v => Math.max(0, v - decay));
    }
    if (battle.cores.some(v => v <= 0)) {
        if (battle.cores[0] <= 0 && battle.cores[1] <= 0)
            battle.winner = battle.stats[0].damage === battle.stats[1].damage ? (battle.random() < .5 ? 0 : 1) : battle.stats[0].damage > battle.stats[1].damage ? 0 : 1;
        else
            battle.winner = battle.cores[1] <= 0 ? 0 : 1;
        battle.phase = 'ended';
        battle.emit({ type: 'finish', side: battle.winner, lane: 1, x: 0 });
    }
}
