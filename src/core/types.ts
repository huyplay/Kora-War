import type { AbilityEffect } from '../data/abilities';
export type Side = 0 | 1;
export type Phase = 'ready' | 'playing' | 'paused' | 'ended';
export type Difficulty = 'story' | 'normal' | 'hard';
export interface SlowEffect {
  factor: number;
  until: number;
}
export interface Unit {
  id: number;
  heroId: string;
  side: Side;
  lane: number;
  x: number;
  previousX: number;
  hp: number;
  maxHp: number;
  shield: number;
  attack: number;
  range: number;
  speed: number;
  attackCd: number;
  skillCd: number;
  slowUntil: number;
  slowFactor: number;
  /** Tactical only: each strength retains its own expiry. Legacy units omit this field. */
  slowEffects?: SlowEffect[];
  stunUntil: number;
  frozenUntil?: number;
  weakenUntil?: number;
  hasteUntil?: number;
  hasteFactor?: number;
  weakenFactor?: number;
  born: number;
  attackAt: number;
  skillAt: number;
  state: 'move' | 'attack' | 'stunned';
}
export interface Tower {
  id: string;
  side: Side;
  lane: number;
  x: number;
  hp: number;
  maxHp: number;
  cooldown: number;
}
/** Presentation trace of effects already resolved by combat, never client command input. */
export interface SkillTarget {
  unitId: number;
  x: number;
  side: Side;
  effects: AbilityEffect['kind'][];
}
export interface GameEvent {
  id: number;
  time: number;
  type: 'spawn' | 'hit' | 'projectile' | 'skill' | 'heal' | 'death' | 'tower' | 'core' | 'pulse' | 'finish';
  side: Side;
  lane: number;
  x: number;
  toX?: number;
  targetId?: number;
  sourceId?: number;
  skillTargets?: SkillTarget[];
  value?: number;
  heroId?: string;
  label?: string;
}
export interface Stats {
  deployed: number;
  kills: number;
  damage: number;
  healed: number;
  skills: number;
  towers: number;
  spent: number;
}
