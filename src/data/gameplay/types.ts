import type { SpellId } from '../spells';
import type { Origin, Role } from '../types';
import type { DeploymentRule } from '../deployment';

export type EffectKind =
  'damage' | 'heal' | 'shield' | 'slow' | 'stun' | 'freeze' | 'push' | 'weaken' | 'haste';
export interface SpellEffect {
  kind: EffectKind;
  amount: number;
  duration?: number;
  cap?: number;
  stacking?: 'refresh' | 'ignore-active';
}
export interface SpellConfig {
  id: SpellId;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  cost: number;
  cooldown: number;
  radius: number;
  warning: number;
  duration: number;
  target: 'enemy' | 'ally' | 'all';
  effects: SpellEffect[];
}
export type BuffKind =
  'shield' | 'health' | 'attack' | 'attackSpeed' | 'skillCooldown' | 'mana' | 'regeneration' | 'slowOnHit';
export type TraitId = Origin | Role;
export interface SynergyConfig {
  required: number;
  scope: 'team' | 'members';
  effects: { kind: BuffKind; amount: number; duration?: number }[];
}
export interface GameplayConfig {
  version: 1;
  startingMana: number;
  deck: {
    size: number;
    handSize: number;
    minHeroes: number;
    minSpells: number;
    maxCopies: number;
    mulligan: number;
    shuffle: boolean;
    recycle: boolean;
    defaultCards: string[];
    aiCards: string[];
  };
  board: {
    /** Absent in immutable historical snapshots: original deployment rules. */
    deployment?: DeploymentRule;
    minX: number;
    maxX: number;
    spawnMin: number;
    spawnMax: number;
    spawnX: number;
    quickSpawnX: number;
    towerX: number;
    coreX: number;
    halfWidth: number;
  };
  combat: {
    initialAttackDelay: number;
    initialSkillDelay: number;
    nearEnemyBonus: number;
    allyRadius: number;
    structureReach: number;
    levelGrowth: number;
  };
  resonance: {
    enabled: boolean;
    cap: number;
    passive: number;
    damageGain: number;
    killGain: number;
    structureGain: number;
    damage: number;
    heal: number;
    stun: number;
  };
  synergies: Record<TraitId, SynergyConfig>;
  spells: Record<SpellId, SpellConfig>;
  ai: {
    firstDecision: number;
    storyInterval: number;
    normalInterval: number;
    hardInterval: number;
    jitter: number;
    threatDistance: number;
    threatWeight: number;
    friendlyWeight: number;
    destroyedTowerBonus: number;
    laneRandom: number;
    cardRandom: number;
    meleeRange: number;
    formationHp: number;
    formationBonus: number;
    healMissingHp: number;
    pulseEnemies: number;
    spellClusterRadius: number;
    spellClusterSize: number;
    cycleEmptySpells: boolean;
  };
  match: {
    openingSeconds: number;
    reconnectSeconds: number;
    maximumSeconds: number;
    tieBreak: 'damage-seeded' | 'damage-player0';
  };
  collection: { initialGold: number; maxLevel: number; copiesPerLevel: number; chestDraws: number };
}
