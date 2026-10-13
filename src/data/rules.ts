/** Luật bản Three.js đã được người dùng chốt giữ ngày 13/10/2026. */
export const RULES = Object.freeze({ tickRate: 20, coreHp: 1500, towerHp: 400, towerDamage: 27, towerRange: 4, towerCooldown: 1.35, startingMana: 5, maxMana: 10, manaPerSecond: 1.05, cardCooldown: 1.8, maxUnits: 100, overtimeAt: 180, overtimeBaseDamage: 8, overtimeAcceleration: 0.65, eventLimit: 200 });
export const STEP = 1 / RULES.tickRate;
