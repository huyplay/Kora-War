import { HEROES } from './heroes';
import { SPELLS, isSpell, type SpellId } from './spells';
import type { Origin, Role } from './types';

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
export function deckError(value: unknown, config: GameplayConfig): string | null {
  const d = config.deck;
  if (!Array.isArray(value) || value.length !== d.size) return `Deck cần đúng ${d.size} thẻ.`;
  const counts = new Map<string, number>();
  for (const id of value) {
    if (typeof id !== 'string' || (!HEROES.some((h) => h.id === id) && !isSpell(id)))
      return 'Deck chứa thẻ không hợp lệ.';
    if (isSpell(id) && !config.spells[id].enabled) return `Phép ${config.spells[id].name} đã bị tắt.`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (counts.get(id)! > d.maxCopies) return `Mỗi thẻ chỉ được có ${d.maxCopies} bản trong deck.`;
  }
  if (value.filter((id) => !isSpell(id)).length < d.minHeroes || value.filter(isSpell).length < d.minSpells)
    return `Deck cần ít nhất ${d.minHeroes} tướng và ${d.minSpells} phép.`;
  return null;
}
export function fitDeck(saved: string[] | undefined, g: GameplayConfig): string[] {
  if (!deckError(saved, g)) return saved!.slice();
  // A changed admin ruleset invalidates old loadouts; use the validated published starter deck.
  return g.deck.defaultCards.slice();
}
export function synergyDescription(g: GameplayConfig, id: TraitId) {
  const rule = g.synergies[id];
  const names: Record<BuffKind, string> = {
    shield: 'khiên xuất trận',
    health: 'máu',
    attack: 'sát thương',
    attackSpeed: 'tốc đánh',
    skillCooldown: 'thời gian hồi kỹ năng',
    mana: 'hồi mana',
    regeneration: 'HP/giây',
    slowOnHit: 'tốc độ đi khi trúng đòn',
  };
  return `${rule.required} tướng · ${rule.scope === 'team' ? 'toàn đội' : 'thành viên hệ/tộc'}: ${rule.effects.map((e) => `${names[e.kind]} ${['shield', 'regeneration'].includes(e.kind) ? '+' : '×'}${e.amount}${e.duration ? ` / ${e.duration}s` : ''}`).join(', ') || 'không có hiệu ứng'}`;
}
export function validateGameplay(value: unknown, maxMana: number) {
  const g = value as GameplayConfig;
  const fail = (path: string): never => {
    throw new Error(`Gameplay ${path} không hợp lệ.`);
  };
  if (!g || g.version !== 1) fail('version');
  const n = (v: unknown, path: string, min = 0, max = 10000, integer = false) => {
    if (
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      v < min ||
      v > max ||
      (integer && !Number.isInteger(v))
    )
      fail(path);
  };
  const object = (v: unknown, path: string, keys: string[]) => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some((k) => !keys.includes(k)))
      fail(path);
  };
  const template = defaultGameplay();
  object(g, '', Object.keys(template));
  n(g.startingMana, 'startingMana', 0, maxMana);
  for (const group of ['deck', 'board', 'combat', 'resonance', 'ai', 'match', 'collection'] as const) {
    object(g[group], group, Object.keys(template[group]));
    for (const [key, expected] of Object.entries(template[group])) {
      const actual = (g[group] as unknown as Record<string, unknown>)[key];
      if (typeof expected === 'number')
        n(actual, `${group}.${key}`, group === 'board' && key === 'minX' ? -14 : 0);
      if (typeof expected === 'boolean' && typeof actual !== 'boolean') fail(`${group}.${key}`);
    }
  }
  const d = g.deck;
  for (const k of ['size', 'handSize', 'minHeroes', 'minSpells', 'maxCopies', 'mulligan'] as const)
    n(d[k], `deck.${k}`, 0, 54, true);
  if (
    d.maxCopies < 1 ||
    d.maxCopies > 3 ||
    d.size < 2 ||
    d.handSize < 2 ||
    d.handSize > 10 ||
    d.handSize > d.size ||
    d.minHeroes + d.minSpells > d.handSize ||
    d.mulligan > d.handSize ||
    d.mulligan > d.size - d.handSize
  )
    fail('deck composition');
  if (d.minHeroes < 1 || d.minSpells < 1) fail('deck opening minimum');
  const b = g.board;
  if (
    b.minX !== -b.maxX ||
    b.maxX < 7 ||
    b.maxX > 14 ||
    b.spawnMin <= 0 ||
    b.spawnMax > b.maxX ||
    b.spawnMin >= b.spawnMax ||
    b.spawnX < b.spawnMin ||
    b.spawnX > b.spawnMax ||
    b.quickSpawnX < b.spawnMin ||
    b.quickSpawnX > b.spawnMax ||
    b.towerX < b.spawnMin ||
    b.towerX > b.spawnMax ||
    b.coreX < b.towerX ||
    b.coreX > b.maxX ||
    b.halfWidth <= 0 ||
    b.halfWidth > 1.7
  )
    fail('board');
  if (
    !g.resonance.cap ||
    g.match.openingSeconds > 120 ||
    g.match.reconnectSeconds < 1 ||
    g.match.reconnectSeconds > 300 ||
    g.match.maximumSeconds < 30 ||
    g.match.maximumSeconds > 1800 ||
    !['damage-seeded', 'damage-player0'].includes(g.match.tieBreak)
  )
    fail('match/resonance');
  n(g.collection.initialGold, 'collection.initialGold', 0, 1000000, true);
  n(g.collection.maxLevel, 'collection.maxLevel', 1, 10, true);
  n(g.collection.copiesPerLevel, 'collection.copiesPerLevel', 1, 100, true);
  n(g.collection.chestDraws, 'collection.chestDraws', 1, 20, true);
  for (const k of ['firstDecision', 'storyInterval', 'normalInterval', 'hardInterval'] as const)
    n(g.ai[k], `ai.${k}`, 0.05, 60);
  n(g.ai.threatDistance, 'ai.threatDistance', 1, 100);
  object(g.spells, 'spells', Object.keys(SPELLS));
  for (const id of Object.keys(SPELLS) as SpellId[]) {
    const s = g.spells[id];
    object(s, `spells.${id}`, Object.keys(template.spells[id]));
    if (
      s.id !== id ||
      typeof s.enabled !== 'boolean' ||
      !['enemy', 'ally', 'all'].includes(s.target) ||
      !/^#[a-f\d]{6}$/i.test(s.color)
    )
      fail(`spells.${id}`);
    for (const k of ['name', 'description', 'icon'] as const)
      if (typeof s[k] !== 'string' || !s[k].length || s[k].length > 1000) fail(`spells.${id}.${k}`);
    n(s.cost, `spells.${id}.cost`, 0, maxMana, true);
    n(s.cooldown, `spells.${id}.cooldown`, 0, 120);
    n(s.radius, `spells.${id}.radius`, 0.05, 28);
    n(s.warning, `spells.${id}.warning`, 0, 10);
    n(s.duration, `spells.${id}.duration`, 0, 60);
    if (!Array.isArray(s.effects) || !s.effects.length || s.effects.length > 10) fail(`spells.${id}.effects`);
    for (const e of s.effects) {
      object(e, `spells.${id}.effect`, ['kind', 'amount', 'duration', 'cap', 'stacking']);
      if (!['damage', 'heal', 'shield', 'slow', 'stun', 'freeze', 'push', 'weaken', 'haste'].includes(e.kind))
        fail(`spells.${id}.effect.kind`);
      n(
        e.amount,
        `spells.${id}.effect.amount`,
        ['haste'].includes(e.kind) ? 0.05 : 0,
        ['slow', 'weaken'].includes(e.kind) ? 1 : e.kind === 'haste' ? 5 : 10000,
      );
      if (['slow', 'stun', 'freeze', 'weaken', 'haste'].includes(e.kind))
        n(e.duration, `spells.${id}.effect.duration`, 0.05, 60);
      else if (e.duration !== undefined) n(e.duration, `spells.${id}.effect.duration`, 0, 60);
      if (e.cap !== undefined) n(e.cap, `spells.${id}.effect.cap`);
      if (e.stacking !== undefined && !['refresh', 'ignore-active'].includes(e.stacking))
        fail(`spells.${id}.effect.stacking`);
    }
  }
  object(g.synergies, 'synergies', Object.keys(template.synergies));
  for (const id of Object.keys(template.synergies) as TraitId[]) {
    const s = g.synergies[id];
    object(s, `synergies.${id}`, ['required', 'scope', 'effects']);
    n(s.required, `synergies.${id}.required`, 1, 54, true);
    if (!['team', 'members'].includes(s.scope) || !Array.isArray(s.effects) || s.effects.length > 10)
      fail(`synergies.${id}`);
    for (const e of s.effects) {
      object(e, `synergies.${id}.effect`, ['kind', 'amount', 'duration']);
      if (
        ![
          'shield',
          'health',
          'attack',
          'attackSpeed',
          'skillCooldown',
          'mana',
          'regeneration',
          'slowOnHit',
        ].includes(e.kind)
      )
        fail(`synergies.${id}.effect.kind`);
      n(e.amount, `synergies.${id}.effect.amount`, 0, e.kind === 'slowOnHit' ? 1 : 10000);
      if (['health', 'attackSpeed', 'skillCooldown', 'mana'].includes(e.kind) && e.amount <= 0)
        fail(`synergies.${id}.effect.amount`);
      if (e.kind === 'slowOnHit') n(e.duration, `synergies.${id}.effect.duration`, 0.05, 60);
    }
  }
  for (const key of ['defaultCards', 'aiCards'] as const) {
    const error = deckError(d[key], g);
    if (error) throw new Error(`Gameplay deck.${key}: ${error}`);
  }
}
