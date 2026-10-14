import type { Unit } from '../../core/types';

/** Snapshot deltas are real HP changes, so shield absorption is never shown as lost HP. */
export class UnitFeedback {
  private hp: number;
  private shield: number;
  private pendingDamage = 0;
  private pendingHealing = 0;
  private numberCooldown = 0;
  flash = 0;
  trailHp: number;
  constructor(unit: Unit) {
    this.hp = this.trailHp = unit.hp;
    this.shield = unit.shield;
  }
  update(unit: Unit, dt: number) {
    const damage = Math.max(0, this.hp - unit.hp),
      heal = Math.max(0, unit.hp - this.hp);
    if (damage || unit.shield < this.shield) this.flash = Math.max(this.flash, damage ? 0.7 : 0.35);
    this.pendingDamage += damage;
    this.pendingHealing += heal;
    this.hp = unit.hp;
    this.shield = unit.shield;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.trailHp = Math.max(unit.hp, unit.hp + (this.trailHp - unit.hp) * Math.exp(-dt * 6));
    this.numberCooldown = Math.max(0, this.numberCooldown - dt);
    // Combine tiny regeneration ticks instead of flooding the battlefield with +1 labels.
    if (this.numberCooldown > 0 || (!this.pendingDamage && this.pendingHealing < 3)) return undefined;
    const result = { damage: this.pendingDamage, healing: this.pendingHealing };
    this.pendingDamage = this.pendingHealing = 0;
    this.numberCooldown = 0.18;
    return result;
  }
}
