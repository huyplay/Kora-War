import type { Tower, Phase } from '../core/types';
import { DEFENSE_CUE_COOLDOWN, type AudioProfile } from '../data/media';

export type DefenseCue = 'tower-warning' | 'core-warning';
export interface DefenseSnapshot {
  time: number;
  phase: Phase;
  cores: readonly number[];
  towers: readonly Tower[];
  content: { audio?: AudioProfile };
}
export interface DefenseFrame {
  message: string;
  kind?: 'tower' | 'core';
  red: boolean;
  cue?: DefenseCue;
}
const quiet = (): DefenseFrame => ({ message: '', red: false });

/** Presentation state only: observe own HP, never infer damage from attack/projectile events. */
export class DefenseState {
  private core?: number;
  private towers = new Map<string, number>();
  private lastTime?: number;
  private clock = 0;
  private redUntil = 0;
  private messageUntil = 0;
  private message = '';
  private kind?: 'tower' | 'core';
  private nextCore = 0;
  private nextTower = 0;
  private nextMessage = 0;
  update(state: DefenseSnapshot, seconds: number, running = state.phase === 'playing'): DefenseFrame {
    if (this.lastTime !== undefined && state.time < this.lastTime) this.reset();
    const coreDamage = this.core !== undefined && state.cores[0] < this.core;
    const damaged = state.towers.filter(
      (t) => t.side === 0 && this.towers.has(t.id) && t.hp < this.towers.get(t.id)!,
    );
    this.core = state.cores[0];
    this.lastTime = state.time;
    this.towers = new Map(state.towers.filter((t) => t.side === 0).map((t) => [t.id, t.hp]));
    if (!running || state.phase !== 'playing') return quiet();
    this.clock += Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    let cue: DefenseCue | undefined;
    if (coreDamage && this.core > 0) {
      this.kind = 'core';
      this.message = 'Thành đang chịu sát thương!';
      this.messageUntil = this.redUntil = this.clock + 2.4;
      if (this.clock >= this.nextCore) {
        cue = 'core-warning';
        this.nextCore =
          this.clock + (state.content.audio?.cues[cue]?.cooldownMs ?? DEFENSE_CUE_COOLDOWN[cue]) / 1000;
      }
    } else if (damaged.length && this.clock >= this.redUntil) {
      const tower = damaged.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.lane - b.lane)[0];
      const lane = ['trên', 'giữa', 'dưới'][tower.lane];
      if (this.kind !== 'tower' || this.clock >= this.nextMessage || tower.hp <= 0) {
        this.kind = 'tower';
        this.message = `Trụ ${lane} ${tower.hp <= 0 ? 'đã thất thủ' : 'đang bị đánh'}!`;
        this.nextMessage = this.clock + 2.4;
      }
      this.messageUntil = this.clock + 2.4;
      if (this.clock >= this.nextTower) {
        cue = 'tower-warning';
        this.nextTower =
          this.clock + (state.content.audio?.cues[cue]?.cooldownMs ?? DEFENSE_CUE_COOLDOWN[cue]) / 1000;
      }
    }
    return {
      message: this.clock < this.messageUntil ? this.message : '',
      kind: this.kind,
      red: this.clock < this.redUntil,
      cue,
    };
  }
  reset() {
    this.core = this.lastTime = undefined;
    this.towers.clear();
    this.clock = this.redUntil = this.messageUntil = this.nextCore = this.nextTower = this.nextMessage = 0;
    this.message = '';
    this.kind = undefined;
  }
}
