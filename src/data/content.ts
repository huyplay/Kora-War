import { HEROES } from './heroes';
import { ABILITIES, type AbilityDefinition } from './abilities';
import { RULES } from './rules';
import type { Hero } from './types';

export type BattleRules = { [K in keyof typeof RULES]: number };
export interface ModelBinding {
    assetId: string;
    height: number;
    yaw: number;
    clips: Partial<Record<'idle' | 'walk' | 'attack' | 'cast' | 'stunned' | 'spawn' | 'death', string>>;
    animationAssetId?: string;
}
export interface MapProp { assetId: string; x: number; z: number; scale: number; yaw: number }
export interface ContentConfig {
    schema: 1;
    heroes: Hero[];
    abilities: Record<string, AbilityDefinition>;
    rules: BattleRules;
    models: Record<string, ModelBinding>;
    map: { id: string; name: string; background: string; exposure: number; props: MapProp[] };
    vfx: { ally: string; enemy: string; heal: string; intensity: number; spriteAssetId?: string };
    economy: { winGold: number; lossGold: number; chestCost: number; chestGold: number; upgradeBase: number };
    items: { id: string; name: string; price: number; heroId: string; copies: number; iconAssetId?: string }[];
}
export function defaultContent(): ContentConfig {
    return structuredClone({ schema: 1, heroes: HEROES, abilities: ABILITIES, rules: RULES, models: {},
        map: { id: 'genesis', name: 'Thung lũng Khởi Nguyên', background: '#142c31', exposure: 1.25, props: [] },
        vfx: { ally: '#7ddcff', enemy: '#ffa075', heal: '#70ffc7', intensity: 1 },
        economy: { winGold: 80, lossGold: 25, chestCost: 100, chestGold: 30, upgradeBase: 75 },
        items: HEROES.map(h => ({ id: `shard-${h.id}`, name: `Mảnh ${h.name}`, price: 40, heroId: h.id, copies: 2 })) });
}
export function validateContent(input: unknown): asserts input is ContentConfig {
    const c = input as ContentConfig;
    const fail = (message: string): never => { throw new Error(message); };
    const num = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
    const text = (s: unknown, max = 200) => typeof s === 'string' && s.length > 0 && s.length <= max;
    const asset = (s: unknown) => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(s);
    const color = (s: unknown) => typeof s === 'string' && /^#[a-fA-F0-9]{6}$/.test(s);
    if (!c || c.schema !== 1 || !Array.isArray(c.heroes) || c.heroes.length !== 10) fail('Catalog phải có 10 tướng.');
    if (new Set(c.heroes.map(h => h.id)).size !== 10) fail('ID tướng bị trùng.');
    for (const h of c.heroes) {
        const original = HEROES.find(o => o.id === h.id);
        if (!original || h.name !== original.name || h.origin !== original.origin || h.role !== original.role || h.weapon !== original.weapon) fail('Giữ ID, tên, hệ/tộc và vũ khí Aetherfall đã chốt.');
        for (const key of ['title', 'ability', 'description'] as const) if (!text(h[key], 1000)) fail(`Nội dung ${h.id}.${key} không hợp lệ.`);
        for (const key of ['hp', 'attack', 'range', 'speed', 'interval', 'skillCooldown'] as const) if (!num(h[key], .05, key === 'hp' ? 10000 : 1000)) fail(`Chỉ số ${h.id}.${key} không hợp lệ.`);
        if (!Number.isInteger(h.cost) || !num(h.cost, 1, 10)) fail('Mana thẻ phải từ 1–10.');
        if (!num(h.color, 0, 0xffffff) || !num(h.accent, 0, 0xffffff)) fail('Màu tướng không hợp lệ.');
        const a = c.abilities?.[h.id];
        if (!a || !['enemy','enemyOrAlly','woundedAllies'].includes(a.trigger) || !Array.isArray(a.effects) || !a.effects.length || a.effects.length > 10) fail(`Kỹ năng ${h.id} không hợp lệ.`);
        if (a.missingHp !== undefined && !num(a.missingHp,0,10000)) fail('missingHp không hợp lệ.');
        for (const e of a.effects) {
            if (!['damage','heal','shield','slow','stun'].includes(e.kind) || !num(e.amount,0,e.kind === 'slow' ? 1 : 10000)) fail('Hiệu ứng không hợp lệ.');
            if (!e.targets || !['self','nearEnemies','allies','areaEnemies'].includes(e.targets.group)) fail('Mục tiêu không hợp lệ.');
            if (e.duration !== undefined && !num(e.duration,.05,60)) fail('Thời lượng không hợp lệ.');
            if (['slow','stun'].includes(e.kind) && e.duration === undefined) fail('Slow/stun cần thời lượng.');
            if (e.cap !== undefined && !num(e.cap,0,10000)) fail('Giới hạn shield không hợp lệ.');
            if (e.targets.radius !== undefined && !num(e.targets.radius,.05,40)) fail('Bán kính không hợp lệ.');
            if (e.targets.limit !== undefined && (!Number.isInteger(e.targets.limit) || !num(e.targets.limit,1,100))) fail('Giới hạn mục tiêu không hợp lệ.');
            if (e.targets.order !== undefined && !['health','healthRatio'].includes(e.targets.order)) fail('Thứ tự mục tiêu không hợp lệ.');
        }
    }
    if (!c.rules) fail('Thiếu luật trận.');
    for (const k of Object.keys(RULES) as (keyof BattleRules)[]) if (!num(c.rules[k], .01, 10000)) fail(`Luật ${k} không hợp lệ.`);
    if (c.rules.tickRate !== 20 || c.rules.maxMana !== 10 || c.rules.maxUnits > 100 || c.rules.startingMana > 10 || !Number.isInteger(c.rules.maxUnits) || !Number.isInteger(c.rules.eventLimit)) fail('Giữ tick 20 Hz, mana tối đa 10, tối đa 100 quân.');
    if (!c.models || Object.keys(c.models).some(id => !HEROES.some(h=>h.id===id))) fail('Model gán vào tướng không tồn tại.');
    for (const m of Object.values(c.models)) {
        if (!asset(m.assetId) || !num(m.height,.2,5) || !num(m.yaw,-360,360) || !m.clips || (m.animationAssetId && !asset(m.animationAssetId))) fail('Binding model không hợp lệ.');
        for (const [state, clip] of Object.entries(m.clips)) if (!['idle','walk','attack','cast','stunned','spawn','death'].includes(state) || !text(clip,200)) fail('Clip animation không hợp lệ.');
    }
    if (!c.map || !asset(c.map.id) || !text(c.map.name) || !color(c.map.background) || !num(c.map.exposure,.2,3) || !Array.isArray(c.map.props) || c.map.props.length > 100) fail('Map không hợp lệ.');
    for (const p of c.map.props) if (!asset(p.assetId) || !num(p.x,-22,22) || !num(p.z,-13,13) || !num(p.scale,.01,20) || !num(p.yaw,-360,360)) fail('Prop map không hợp lệ.');
    if (!c.vfx || !color(c.vfx.ally) || !color(c.vfx.enemy) || !color(c.vfx.heal) || !num(c.vfx.intensity,.1,3) || (c.vfx.spriteAssetId && !asset(c.vfx.spriteAssetId))) fail('VFX không hợp lệ.');
    if (!c.economy) fail('Thiếu economy.');
    for (const k of ['winGold','lossGold','chestCost','chestGold','upgradeBase'] as const) if (!Number.isInteger(c.economy[k]) || !num(c.economy[k],1,100000)) fail('Economy phải là số nguyên dương.');
    if (c.economy.chestGold >= c.economy.chestCost) fail('Vàng trong rương phải nhỏ hơn giá rương.');
    if (!Array.isArray(c.items) || c.items.length > 100 || new Set(c.items.map(i=>i.id)).size !== c.items.length) fail('Danh mục vật phẩm không hợp lệ.');
    for (const i of c.items) if (!asset(i.id) || !text(i.name) || !c.heroes.some(h=>h.id===i.heroId) || !Number.isInteger(i.price) || !num(i.price,1,100000) || !Number.isInteger(i.copies) || !num(i.copies,1,100) || (i.iconAssetId && !asset(i.iconAssetId))) fail('Vật phẩm không hợp lệ.');
}
export function assetReferences(c: ContentConfig): string[] {
    return [...new Set([...Object.values(c.models).flatMap(m=>[m.assetId,...(m.animationAssetId?[m.animationAssetId]:[])]),...c.map.props.map(p=>p.assetId),...c.items.flatMap(i=>i.iconAssetId?[i.iconAssetId]:[]),...(c.vfx.spriteAssetId?[c.vfx.spriteAssetId]:[])])];
}
