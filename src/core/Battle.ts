import { DEFAULT_DECK, ENEMY_DECK, HERO_MAP, LANES, RULES, STEP, traits, type Hero } from '../data/index';
import { runAI } from './ai/heuristic';
import { castAbility } from './systems/cast-ability';
import { applyDamage, applyHealing } from './systems/damage';
import { deployUnit, validateDeployment } from './systems/deployment';
import { updateMana } from './systems/mana';
import { castPulse } from './systems/pulse';
import { updateTowers } from './systems/towers';
import { updateUnits } from './systems/units';
import { updateVictory } from './systems/victory';
import type { Difficulty, GameEvent, Phase, Side, Stats, Tower, Unit } from './types';
import { defaultContent, validateContent, type ContentConfig } from '../data/content';
const freshStats = (): Stats => ({ deployed: 0, kills: 0, damage: 0, healed: 0, skills: 0, towers: 0, spent: 0 });
/** Original single-player ruleset Aetherfall v0.1. Renderer never owns combat. */
export class Battle {
    phase: Phase = 'ready';
    time = 0;
    tick = 0;
    seed: number;
    rng: number;
    nextId = 1;
    eventId = 1;
    units: Unit[] = [];
    towers: Tower[] = [];
    events: GameEvent[] = [];
    mana: number[] = [RULES.startingMana, RULES.startingMana];
    cores: number[] = [RULES.coreHp, RULES.coreHp];
    maxCore: number = RULES.coreHp;
    resonance = [0, 0];
    decks: string[][];
    synergies: Record<string, number>[];
    cooldowns: Record<string, number>[] = [{}, {}];
    stats: Stats[] = [freshStats(), freshStats()];
    winner: Side | null = null;
    difficulty: Difficulty;
    aiEnabled = true;
    aiAt = 2.5;
    maxUnits: number = RULES.maxUnits;
    debugUsed = false;
    readonly content: ContentConfig;
    readonly heroes: Record<string, Hero>;
    readonly levels: Record<string, number>;
    constructor(deck = DEFAULT_DECK, difficulty: Difficulty = 'normal', seed = 20261013, enemyDeck = ENEMY_DECK, content = defaultContent(), levels: Record<string,number> = {}) {
        validateContent(content);
        this.content = structuredClone(content);
        this.heroes = Object.fromEntries(this.content.heroes.map(h => [h.id,h]));
        this.levels = { ...levels };
        this.mana = [content.rules.startingMana, content.rules.startingMana];
        this.cores = [content.rules.coreHp,content.rules.coreHp];
        this.maxCore = content.rules.coreHp;
        this.maxUnits = content.rules.maxUnits;
        for (const d of [deck, enemyDeck])
            if (d.length !== 4 || new Set(d).size !== 4 || d.some(id => !Object.hasOwn(HERO_MAP, id)))
                throw new Error('Deck cần đúng 4 tướng khác nhau.');
        this.decks = [deck.slice(), enemyDeck.slice()];
        this.synergies = this.decks.map(traits);
        this.difficulty = difficulty;
        this.seed = seed >>> 0;
        this.rng = this.seed || 1;
        for (const side of [0, 1] as const)
            for (let lane = 0; lane < LANES.length; lane++)
                this.towers.push({ id: `${side}-${lane}`, side, lane, x: side === 0 ? -9 : 9, hp: this.content.rules.towerHp, maxHp: this.content.rules.towerHp, cooldown: 0 });
    }
    random() { let x = this.rng; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.rng = x >>> 0; return this.rng / 4294967296; }
    start() {
        if (this.phase === 'ready')
            this.phase = 'playing';
    }
    emit(event: Omit<GameEvent, 'id' | 'time'>) {
        this.events.push({ ...event, id: this.eventId++, time: this.time });
        if (this.events.length > this.content.rules.eventLimit)
            this.events.splice(0, this.events.length - this.content.rules.eventLimit);
    }
    has(side: Side, trait: string) { return (this.synergies[side][trait] || 0) >= 2; }
    canPlay(side: Side, heroId: string, lane: number, x = side === 0 ? -12 : 12): string | null { return validateDeployment(this, side, heroId, lane, x); }
    play(side: Side, heroId: string, lane: number, x = side === 0 ? -12 : 12): string | null { return deployUnit(this, side, heroId, lane, x); }
    damage(target: Unit, amount: number, side: Side, source?: Unit) { return applyDamage(this, target, amount, side, source); }
    heal(u: Unit, amount: number) { return applyHealing(this, u, amount); }
    skill(u: Unit, h: Hero, enemies: Unit[]) { return castAbility(this, u, h, enemies); }
    pulse(side: Side, lane: number): string | null { return castPulse(this, side, lane); }
    ai(side: Side = 1) { return runAI(this, side); }
    step() {
        if (this.phase !== 'playing')
            return;
        this.tick++;
        this.time = this.tick * STEP;
        updateMana(this);
        if (this.aiEnabled && this.time >= this.aiAt) {
            this.ai(1);
            this.aiAt = this.time + (this.difficulty === 'story' ? 2.6 : this.difficulty === 'hard' ? .8 : 1.5) + this.random() * .5;
        }
        updateUnits(this);
        updateTowers(this);
        this.units = this.units.filter(u => u.hp > 0);
        updateVictory(this);
    }
    snapshot() { return { tick: this.tick, phase: this.phase, mana: this.mana.map(v => +v.toFixed(4)), cores: this.cores.map(v => +v.toFixed(4)), rng: this.rng, winner: this.winner, units: this.units.map(u => ({ ...u, x: +u.x.toFixed(5), hp: +u.hp.toFixed(5) })), towers: this.towers.map(t => ({ ...t })), stats: this.stats.map(stats => ({ ...stats })) }; }
}
