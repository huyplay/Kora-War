import { defaultArenaPresentation } from './arena-presentation';
import { defaultCompetition, validateCompetition, type CompetitionConfig } from './competition';
import { ABILITIES, DEFAULT_ENGAGE, type AbilityDefinition } from './abilities';
import { HEROES } from './heroes';
import { ORIGINS, ROLES } from './traits';
import { RULES } from './rules';
import { isSpell, type SpellId } from './spells';
import type { Hero } from './types';
import { defaultGameplay, validateGameplay, type GameplayConfig } from './gameplay';
import { defaultCommunication, validateCommunication, type CommunicationConfig } from './communication';
import { defaultPresentation, validatePresentation, type PresentationConfig } from './presentation';
import {
  defaultAudio,
  SOUND_CUES,
  VFX_EVENTS,
  type AudioProfile,
  type TextureBinding,
  type SpriteBinding,
  type VfxEvent,
} from './media';
export type BattleRules = {
  -readonly [K in keyof typeof RULES]: number;
};
export interface ModelBinding {
  assetId: string;
  height: number;
  yaw: number;
  portraitYaw?: number;
  showcaseYaw?: number;
  hiddenMaterials?: string[];
  clips: Partial<Record<'idle' | 'walk' | 'attack' | 'cast' | 'stunned' | 'spawn' | 'death', string>>;
  animationAssetId?: string;
}
export interface MapProp {
  assetId: string;
  x: number;
  z: number;
  y?: number;
  tint?: string;
  scale: number;
  yaw: number;
}
export interface ContentConfig {
  schema: 1;
  competition?: CompetitionConfig;
  heroes: Hero[];
  abilities: Record<string, AbilityDefinition>;
  rules: BattleRules;
  gameplay?: GameplayConfig;
  communication?: CommunicationConfig;
  presentation?: PresentationConfig;
  models: Record<string, ModelBinding>;
  audio?: AudioProfile;
  map: {
    id: string;
    name: string;
    background: string;
    exposure: number;
    props: MapProp[];
    towerAssetId?: string;
    coreAssetId?: string;
    backdropAssetId?: string;
    backdropCrop?: number;
    textures?: Partial<Record<'stone' | 'grass' | 'wall', TextureBinding>>;
  };
  vfx: {
    ally: string;
    enemy: string;
    heal: string;
    intensity: number;
    spriteAssetId?: string;
    spriteColumns?: number;
    spriteRows?: number;
    eventSprites?: Partial<Record<VfxEvent, SpriteBinding>>;
    spellSprites?: Partial<Record<SpellId, SpriteBinding>>;
  };
  economy: {
    winGold: number;
    lossGold: number;
    chestCost: number;
    chestGold: number;
    upgradeBase: number;
  };
  items: {
    id: string;
    name: string;
    price: number;
    heroId: string;
    copies: number;
    iconAssetId?: string;
  }[];
}
export function defaultContent(): ContentConfig {
  return structuredClone({
    schema: 1,
    heroes: HEROES.map((hero) =>
      hero.id === 'nyx'
        ? { ...hero, description: 'Ám Kích ưu tiên hậu tuyến theo cấu hình áp sát của kỹ năng.' }
        : hero,
    ),
    abilities: { ...ABILITIES, nyx: { ...ABILITIES.nyx, engage: DEFAULT_ENGAGE } },
    rules: RULES,
    gameplay: defaultGameplay(),
    competition: defaultCompetition(),
    communication: defaultCommunication(),
    presentation: defaultPresentation(),
    models: {},
    audio: defaultAudio(),
    map: { id: 'genesis', name: 'Thung lũng Khởi Nguyên', background: '#142c31', exposure: 1.25, props: [] },
    vfx: { ally: '#7ddcff', enemy: '#ffa075', heal: '#70ffc7', intensity: 1 },
    economy: { winGold: 80, lossGold: 25, chestCost: 100, chestGold: 30, upgradeBase: 75 },
    items: HEROES.map((h) => ({
      id: `shard-${h.id}`,
      name: `Mảnh ${h.name}`,
      price: 40,
      heroId: h.id,
      copies: 2,
    })),
  }) as ContentConfig;
}
/** Upgrade active DB content once; immutable historical match snapshots are left intact. */
export function upgradeContent(input: ContentConfig): ContentConfig {
  const c = structuredClone(input);
  if (!c.gameplay) {
    c.gameplay = defaultGameplay();
    c.abilities.nyx.engage ??= structuredClone(DEFAULT_ENGAGE);
    const nyx = c.heroes.find((h) => h.id === 'nyx');
    if (nyx && nyx.description === HEROES.find((h) => h.id === 'nyx')!.description)
      nyx.description = 'Ám Kích ưu tiên hậu tuyến theo cấu hình áp sát của kỹ năng.';
  }
  c.gameplay.board.quickSpawnX ??= defaultGameplay().board.quickSpawnX;
  c.gameplay.board.deployment ??= defaultGameplay().board.deployment;
  c.communication ??= defaultCommunication();
  c.presentation ??= defaultPresentation();
  c.presentation.arena ??= defaultArenaPresentation();
  c.competition ??= defaultCompetition();
  return c;
}
export function validateContent(input: unknown): asserts input is ContentConfig {
  const c = input as ContentConfig;
  const fail = (message: string): never => {
    throw new Error(message);
  };
  const num = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
  const text = (s: unknown, max = 200) => typeof s === 'string' && s.length > 0 && s.length <= max;
  const asset = (s: unknown) => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(s);
  const color = (s: unknown) => typeof s === 'string' && /^#[a-fA-F0-9]{6}$/.test(s);
  if (
    !c ||
    c.schema !== 1 ||
    !Array.isArray(c.heroes) ||
    c.heroes.length < HEROES.length ||
    c.heroes.length > 100
  )
    fail('Catalog cần giữ tướng Aetherfall gốc và tối đa 100 tướng.');
  if (
    c.heroes.some((h) => !h || typeof h !== 'object') ||
    new Set(c.heroes.map((h) => h.id)).size !== c.heroes.length
  )
    fail('ID tướng bị trùng hoặc không hợp lệ.');
  if (HEROES.some((original) => !c.heroes.some((h) => h.id === original.id)))
    fail('Thiếu tướng Aetherfall gốc.');
  for (const h of c.heroes) {
    const original = HEROES.find((o) => o.id === h.id);
    if (
      original &&
      (h.name !== original.name ||
        h.origin !== original.origin ||
        h.role !== original.role ||
        h.weapon !== original.weapon)
    )
      fail('Giữ ID, tên, hệ/tộc và vũ khí Aetherfall đã chốt.');
    if (
      typeof h.id !== 'string' ||
      !/^[a-z][a-z0-9-]{1,39}$/.test(h.id) ||
      ['constructor', 'prototype'].includes(h.id) ||
      isSpell(h.id) ||
      !text(h.name, 60) ||
      !/^[\p{L}\p{N}][\p{L}\p{N} '’.-]*$/u.test(h.name) ||
      !Object.hasOwn(ORIGINS, h.origin) ||
      !Object.hasOwn(ROLES, h.role) ||
      !['sword', 'bow', 'staff', 'hammer', 'daggers'].includes(h.weapon)
    )
      fail('Danh tính tướng không hợp lệ.');
    for (const key of ['title', 'ability', 'description'] as const)
      if (!text(h[key], 1000)) fail(`Nội dung ${h.id}.${key} không hợp lệ.`);
    for (const key of ['hp', 'attack', 'range', 'speed', 'interval', 'skillCooldown'] as const)
      if (!num(h[key], 0.05, key === 'hp' ? 10000 : 1000)) fail(`Chỉ số ${h.id}.${key} không hợp lệ.`);
    if (!Number.isInteger(h.cost) || !num(h.cost, 1, c.gameplay ? (c.rules?.maxMana ?? 30) : 10))
      fail('Mana thẻ phải nằm trong giới hạn mana trận.');
    if (!num(h.color, 0, 0xffffff) || !num(h.accent, 0, 0xffffff)) fail('Màu tướng không hợp lệ.');
    const a = c.abilities?.[h.id];
    if (
      !a ||
      !['enemy', 'enemyOrAlly', 'woundedAllies'].includes(a.trigger) ||
      !Array.isArray(a.effects) ||
      !a.effects.length ||
      a.effects.length > 10
    )
      fail(`Kỹ năng ${h.id} không hợp lệ.`);
    if (a.missingHp !== undefined && !num(a.missingHp, 0, 10000)) fail('missingHp không hợp lệ.');
    if (
      a.engage &&
      (typeof a.engage.enabled !== 'boolean' ||
        !num(a.engage.radius, 0.05, 28) ||
        !num(a.engage.offset, 0, 5) ||
        !num(a.engage.minRange, 0, 28) ||
        !['', 'vanguard', 'ranger', 'mage', 'guardian', 'support'].includes(a.engage.preferredRole))
    )
      fail('Áp sát kỹ năng không hợp lệ.');
    for (const e of a.effects) {
      if (
        !['damage', 'heal', 'shield', 'slow', 'stun'].includes(e.kind) ||
        !num(e.amount, 0, e.kind === 'slow' ? 1 : 10000)
      )
        fail('Hiệu ứng không hợp lệ.');
      if (!e.targets || !['self', 'nearEnemies', 'allies', 'areaEnemies'].includes(e.targets.group))
        fail('Mục tiêu không hợp lệ.');
      if (e.duration !== undefined && !num(e.duration, 0.05, 60)) fail('Thời lượng không hợp lệ.');
      if (['slow', 'stun'].includes(e.kind) && e.duration === undefined) fail('Slow/stun cần thời lượng.');
      if (e.cap !== undefined && !num(e.cap, 0, 10000)) fail('Giới hạn shield không hợp lệ.');
      if (e.targets.radius !== undefined && !num(e.targets.radius, 0.05, 40)) fail('Bán kính không hợp lệ.');
      if (
        e.targets.limit !== undefined &&
        (!Number.isInteger(e.targets.limit) || !num(e.targets.limit, 1, 100))
      )
        fail('Giới hạn mục tiêu không hợp lệ.');
      if (e.targets.order !== undefined && !['health', 'healthRatio'].includes(e.targets.order))
        fail('Thứ tự mục tiêu không hợp lệ.');
      for (const value of [e.targets.excludeSelf, e.targets.woundedOnly])
        if (value !== undefined && typeof value !== 'boolean') fail('Bộ lọc mục tiêu phải là boolean.');
    }
  }
  if (!c.rules) fail('Thiếu luật trận.');
  for (const k of Object.keys(RULES) as (keyof BattleRules)[])
    if (
      !num(
        c.rules[k],
        [
          'towerDamage',
          'manaPerSecond',
          'cardCooldown',
          'overtimeAt',
          'overtimeBaseDamage',
          'overtimeAcceleration',
          'startingMana',
        ].includes(k)
          ? 0
          : 0.01,
        10000,
      )
    )
      fail(`Luật ${k} không hợp lệ.`);
  if (
    c.rules.tickRate !== 20 ||
    c.rules.maxMana > 30 ||
    c.rules.maxUnits > 100 ||
    (!c.gameplay && c.rules.startingMana > c.rules.maxMana) ||
    !Number.isInteger(c.rules.maxMana) ||
    !Number.isInteger(c.rules.maxUnits) ||
    !Number.isInteger(c.rules.eventLimit)
  )
    fail('Giữ tick 20 Hz, mana tối đa 30, tối đa 100 quân.');
  if (c.gameplay !== undefined) validateGameplay(c.gameplay, c.rules.maxMana, c.heroes);
  if (c.communication !== undefined) validateCommunication(c.communication);
  if (c.presentation !== undefined) validatePresentation(c.presentation);
  if (!c.models || Object.keys(c.models).some((id) => !c.heroes.some((h) => h.id === id)))
    fail('Model gán vào tướng không tồn tại.');
  for (const m of Object.values(c.models)) {
    if (
      !asset(m.assetId) ||
      !num(m.height, 0.2, 5) ||
      !num(m.yaw, -360, 360) ||
      (m.portraitYaw !== undefined && !num(m.portraitYaw, -360, 360)) ||
      (m.showcaseYaw !== undefined && !num(m.showcaseYaw, -360, 360)) ||
      (m.hiddenMaterials !== undefined &&
        (!Array.isArray(m.hiddenMaterials) ||
          m.hiddenMaterials.length > 64 ||
          new Set(m.hiddenMaterials).size !== m.hiddenMaterials.length ||
          m.hiddenMaterials.some(
            (name) => !text(name, 200) || !name.trim() || /[\u0000-\u001f\u007f]/.test(name),
          ))) ||
      !m.clips ||
      (m.animationAssetId && !asset(m.animationAssetId))
    )
      fail('Binding model không hợp lệ.');
    for (const [state, clip] of Object.entries(m.clips))
      if (
        !['idle', 'walk', 'attack', 'cast', 'stunned', 'spawn', 'death'].includes(state) ||
        !text(clip, 200)
      )
        fail('Clip animation không hợp lệ.');
  }
  if (
    !c.map ||
    !asset(c.map.id) ||
    !text(c.map.name) ||
    !color(c.map.background) ||
    !num(c.map.exposure, 0.2, 3) ||
    (c.map.backdropCrop !== undefined && !num(c.map.backdropCrop, 0.35, 1)) ||
    !Array.isArray(c.map.props) ||
    c.map.props.length > 100
  )
    fail('Map không hợp lệ.');
  for (const p of c.map.props)
    if (
      !asset(p.assetId) ||
      !num(p.x, -22, 22) ||
      !num(p.z, -13, 13) ||
      (p.y !== undefined && !num(p.y, -20, 10)) ||
      (p.tint !== undefined && !color(p.tint)) ||
      !num(p.scale, 0.01, 20) ||
      !num(p.yaw, -360, 360)
    )
      fail('Prop map không hợp lệ.');
  for (const id of [c.map.towerAssetId, c.map.coreAssetId, c.map.backdropAssetId])
    if (id && !asset(id)) fail('Asset cấu trúc map không hợp lệ.');
  for (const [kind, binding] of Object.entries(c.map.textures || {}))
    if (
      !['stone', 'grass', 'wall'].includes(kind) ||
      !asset(binding.assetId) ||
      (binding.normalAssetId !== undefined && !asset(binding.normalAssetId)) ||
      (binding.roughnessAssetId !== undefined && !asset(binding.roughnessAssetId)) ||
      !num(binding.repeat, 0.1, 16) ||
      !color(binding.tint)
    )
      fail('Texture map không hợp lệ.');
  if (c.audio) {
    const a = c.audio;
    if (
      ![a.master, a.effects, a.ui].every((v) => num(v, 0, 1)) ||
      !Number.isInteger(a.maxVoices) ||
      !num(a.maxVoices, 1, 24) ||
      !a.cues ||
      !a.heroes
    )
      fail('Audio mixer không hợp lệ.');
    const checkBinding = (b: import('./media').SoundBinding) => {
      if (
        !b ||
        !asset(b.assetId) ||
        !num(b.volume, 0, 1) ||
        !num(b.rate, 0.5, 2) ||
        !num(b.cooldownMs, 0, 10000)
      )
        fail('Sound binding không hợp lệ.');
    };
    for (const [cue, binding] of Object.entries(a.cues)) {
      if (!(SOUND_CUES as readonly string[]).includes(cue)) fail('Sound cue không hợp lệ.');
      checkBinding(binding);
    }
    for (const [hero, bindings] of Object.entries(a.heroes)) {
      if (!c.heroes.some((h) => h.id === hero) || !bindings) fail('Audio tướng không hợp lệ.');
      for (const [cue, binding] of Object.entries(bindings)) {
        if (!['attack', 'cast', 'death', 'footstep'].includes(cue)) fail('Sound tướng không hợp lệ.');
        checkBinding(binding);
      }
    }
  }
  if (
    !c.vfx ||
    !color(c.vfx.ally) ||
    !color(c.vfx.enemy) ||
    !color(c.vfx.heal) ||
    !num(c.vfx.intensity, 0.1, 3) ||
    (c.vfx.spriteAssetId && !asset(c.vfx.spriteAssetId))
  )
    fail('VFX không hợp lệ.');
  for (const size of [c.vfx.spriteColumns, c.vfx.spriteRows])
    if (size !== undefined && (!Number.isInteger(size) || !num(size, 1, 8)))
      fail('Sprite atlas có 1–8 cột/hàng.');
  for (const event of Object.keys(c.vfx.eventSprites || {}))
    if (!(VFX_EVENTS as readonly string[]).includes(event)) fail('VFX event không hợp lệ.');
  for (const spell of Object.keys(c.vfx.spellSprites || {}))
    if (!isSpell(spell)) fail('VFX spell không hợp lệ.');
  for (const binding of Object.values({ ...c.vfx.eventSprites, ...c.vfx.spellSprites })) {
    if (
      !binding ||
      !asset(binding.assetId) ||
      !Number.isInteger(binding.columns) ||
      !num(binding.columns, 1, 8) ||
      !Number.isInteger(binding.rows) ||
      !num(binding.rows, 1, 8) ||
      !num(binding.fps, 4, 60)
    )
      fail('VFX event atlas không hợp lệ.');
  }
  if (c.competition) validateCompetition(c.competition, c);
  if (!c.economy) fail('Thiếu economy.');
  for (const k of ['winGold', 'lossGold', 'chestCost', 'chestGold', 'upgradeBase'] as const)
    if (!Number.isInteger(c.economy[k]) || !num(c.economy[k], 1, 100000))
      fail('Economy phải là số nguyên dương.');
  if (c.economy.chestGold >= c.economy.chestCost) fail('Vàng trong rương phải nhỏ hơn giá rương.');
  if (
    !Array.isArray(c.items) ||
    c.items.length > 100 ||
    new Set(c.items.map((i) => i.id)).size !== c.items.length
  )
    fail('Danh mục vật phẩm không hợp lệ.');
  for (const i of c.items)
    if (
      !asset(i.id) ||
      !text(i.name) ||
      !c.heroes.some((h) => h.id === i.heroId) ||
      !Number.isInteger(i.price) ||
      !num(i.price, 1, 100000) ||
      !Number.isInteger(i.copies) ||
      !num(i.copies, 1, 100) ||
      (i.iconAssetId && !asset(i.iconAssetId))
    )
      fail('Vật phẩm không hợp lệ.');
}
export function assetReferences(c: ContentConfig): string[] {
  return [
    ...new Set([
      ...Object.values(c.models).flatMap((m) => [
        m.assetId,
        ...(m.animationAssetId ? [m.animationAssetId] : []),
      ]),
      ...c.map.props.map((p) => p.assetId),
      ...c.items.flatMap((i) => (i.iconAssetId ? [i.iconAssetId] : [])),
      ...(c.communication?.reactions ?? []).flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : [])),
      ...(c.vfx.spriteAssetId ? [c.vfx.spriteAssetId] : []),
      ...Object.values(c.vfx.eventSprites || {}).map((binding) => binding.assetId),
      ...Object.values(c.vfx.spellSprites || {}).map((binding) => binding.assetId),
      ...[c.map.towerAssetId, c.map.coreAssetId, c.map.backdropAssetId].filter((id): id is string => !!id),
      ...Object.values(c.map.textures || {}).flatMap((b) => [
        b.assetId,
        ...[b.normalAssetId, b.roughnessAssetId].filter((id): id is string => !!id),
      ]),
      ...Object.values(c.audio?.cues || {}).map((b) => b.assetId),
      ...Object.values(c.audio?.heroes || {}).flatMap((bindings) =>
        Object.values(bindings).map((b) => b.assetId),
      ),
    ]),
  ];
}
