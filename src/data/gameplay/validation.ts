import { SPELLS, type SpellId } from '../spells';
import { validateDeploymentRule } from '../deployment';
import { defaultGameplay } from './defaults';
import { deckError } from './deck';
import type { GameplayConfig, TraitId } from './types';

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
  if (b.deployment !== undefined) validateDeploymentRule(b.deployment, b.spawnMax - b.spawnMin);
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
