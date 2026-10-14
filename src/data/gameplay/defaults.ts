import { HEROES } from '../heroes';
import { SPELLS, type SpellId } from '../spells';
import type { GameplayConfig, SpellConfig, SpellEffect } from './types';

const effects: Record<SpellId, SpellEffect[]> = {
  wind: [
    { kind: 'damage', amount: 20 },
    { kind: 'push', amount: 2 },
  ],
  fire: [{ kind: 'damage', amount: 45 }],
  lightning: [
    { kind: 'damage', amount: 110 },
    { kind: 'stun', amount: 0, duration: 0.6, stacking: 'ignore-active' },
  ],
  ice: [
    { kind: 'damage', amount: 35 },
    { kind: 'freeze', amount: 0, duration: 2 },
  ],
  heal: [{ kind: 'heal', amount: 100 }],
  shield: [{ kind: 'shield', amount: 100, cap: 200 }],
  weaken: [{ kind: 'weaken', amount: 0.7, duration: 4 }],
  haste: [{ kind: 'haste', amount: 1.35, duration: 4 }],
};
/** Compatibility profile and seed for the first database migration. Live matches copy DB content. */
export function defaultGameplay(): GameplayConfig {
  return {
    version: 1,
    startingMana: 4,
    deck: {
      size: 14,
      handSize: 6,
      minHeroes: 4,
      minSpells: 1,
      maxCopies: 1,
      mulligan: 2,
      shuffle: true,
      recycle: true,
      defaultCards: [...HEROES.map((h) => h.id), 'wind', 'fire', 'lightning', 'ice'],
      aiCards: [
        'kael',
        'nyx',
        'vesper',
        'mira',
        'raiko',
        'orin',
        'solan',
        'lyra',
        'wind',
        'fire',
        'ice',
        'heal',
        'shield',
        'weaken',
      ],
    },
    board: {
      minX: -14,
      maxX: 14,
      spawnMin: 5.8,
      spawnMax: 13.5,
      spawnX: 12,
      quickSpawnX: 11,
      towerX: 9,
      coreX: 14,
      halfWidth: 1.55,
    },
    combat: {
      initialAttackDelay: 0.5,
      initialSkillDelay: 4,
      nearEnemyBonus: 2.5,
      allyRadius: 5,
      structureReach: 0.45,
      levelGrowth: 0.05,
    },
    resonance: {
      enabled: true,
      cap: 100,
      passive: 0.75,
      damageGain: 0.035,
      killGain: 5,
      structureGain: 2,
      damage: 155,
      heal: 95,
      stun: 1.2,
    },
    synergies: {
      dawn: { required: 2, scope: 'team', effects: [{ kind: 'shield', amount: 55 }] },
      grove: { required: 2, scope: 'team', effects: [{ kind: 'regeneration', amount: 4 }] },
      void: { required: 2, scope: 'team', effects: [{ kind: 'attack', amount: 1.15 }] },
      frost: { required: 2, scope: 'team', effects: [{ kind: 'slowOnHit', amount: 0.8, duration: 1.5 }] },
      storm: { required: 2, scope: 'team', effects: [{ kind: 'mana', amount: 1.2 }] },
      vanguard: { required: 2, scope: 'members', effects: [{ kind: 'attackSpeed', amount: 1.2 }] },
      ranger: { required: 2, scope: 'members', effects: [{ kind: 'attack', amount: 1.2 }] },
      mage: { required: 2, scope: 'members', effects: [{ kind: 'skillCooldown', amount: 0.75 }] },
      guardian: { required: 2, scope: 'members', effects: [{ kind: 'health', amount: 1.25 }] },
      support: { required: 2, scope: 'members', effects: [{ kind: 'skillCooldown', amount: 0.75 }] },
    },
    spells: Object.fromEntries(
      Object.entries(SPELLS).map(([id, spell]) => {
        const { damage: _legacyDamage, ...metadata } = spell;
        return [
          id,
          {
            ...metadata,
            enabled: true,
            target: ['heal', 'shield', 'haste'].includes(id) ? 'ally' : 'enemy',
            effects: structuredClone(effects[id as SpellId]),
          },
        ];
      }),
    ) as Record<SpellId, SpellConfig>,
    ai: {
      firstDecision: 2.5,
      storyInterval: 2.6,
      normalInterval: 1.5,
      hardInterval: 0.8,
      jitter: 0.5,
      threatDistance: 18,
      threatWeight: 1.8,
      friendlyWeight: 0.5,
      destroyedTowerBonus: 0.7,
      laneRandom: 1.4,
      cardRandom: 1,
      meleeRange: 2,
      formationHp: 300,
      formationBonus: 1,
      healMissingHp: 60,
      pulseEnemies: 2,
      spellClusterRadius: 2.5,
      spellClusterSize: 2,
      cycleEmptySpells: true,
    },
    match: { openingSeconds: 15, reconnectSeconds: 30, maximumSeconds: 900, tieBreak: 'damage-seeded' },
    collection: { initialGold: 300, maxLevel: 10, copiesPerLevel: 2, chestDraws: 3 },
  };
}
export const COMPAT_GAMEPLAY = defaultGameplay();
export const LEGACY_GAMEPLAY = defaultGameplay();
LEGACY_GAMEPLAY.spells.ice.effects = [
  { kind: 'damage', amount: 35 },
  { kind: 'slow', amount: 0.6, duration: 2 },
];
export function gameplayOf(content: { gameplay?: GameplayConfig }): GameplayConfig {
  return content.gameplay ?? COMPAT_GAMEPLAY;
}
