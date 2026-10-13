import { LANES } from '../../data/index';
import type { Battle } from '../Battle';
import type { Side } from '../types';
export function runAI(battle: Battle, side: Side = 1) {
    const dir = side === 0 ? 1 : -1;
    const lanes = LANES.map((_, lane) => {
        const threat = battle.units.filter(u => u.side !== side && u.lane === lane && u.hp > 0).reduce((n, u) => n + u.hp / u.maxHp * (1 + (dir === 1 ? -u.x : u.x) / 18), 0);
        const friends = battle.units.filter(u => u.side === side && u.lane === lane && u.hp > 0).length;
        const tower = battle.towers.find(t => t.side !== side && t.lane === lane)!;
        return { lane, score: threat * 1.8 - friends * .5 + (tower.hp <= 0 ? .7 : 0) + battle.random() * 1.4 };
    }).sort((a, b) => b.score - a.score);
    const lane = lanes[0].lane;
    if (battle.resonance[side] >= 100 && battle.units.filter(u => u.side !== side && u.lane === lane).length >= 2)
        battle.pulse(side, lane);
    const front = battle.units.some(u => u.side === side && u.lane === lane && battle.heroes[u.heroId].range < 2);
    const affordable = battle.decks[side].filter(id => !battle.canPlay(side, id, lane)).map(id => ({ id, score: battle.random() + (front ? (battle.heroes[id].range > 2 ? 1 : 0) : (battle.heroes[id].hp > 300 ? 1 : 0)) })).sort((a, b) => b.score - a.score);
    if (affordable.length)
        battle.play(side, affordable[0].id, lane);
}
