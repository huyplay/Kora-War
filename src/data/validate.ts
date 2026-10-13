import { ABILITIES } from './abilities';
import { DEFAULT_DECK, ENEMY_DECK, HEROES } from './heroes';
import { LANES } from './map';
import { RULES } from './rules';
import { ORIGINS, ROLES } from './traits';
/** Fail early with actionable configuration errors, before allocating a WebGL renderer. */
export function validateGameData(): void {
    const ids = new Set<string>();
    for (const hero of HEROES) {
        if (!hero.id || ids.has(hero.id))
            throw new Error(`ID tướng không hợp lệ: ${hero.id}`);
        ids.add(hero.id);
        if (!Object.hasOwn(ORIGINS, hero.origin) || !Object.hasOwn(ROLES, hero.role))
            throw new Error(`Hệ/tộc không tồn tại: ${hero.id}`);
        for (const field of ['cost', 'hp', 'attack', 'range', 'speed', 'interval', 'skillCooldown'] as const) {
            if (!Number.isFinite(hero[field]) || hero[field] <= 0)
                throw new Error(`Chỉ số không hợp lệ: ${hero.id}.${field}`);
        }
        if (!Number.isInteger(hero.cost) || hero.cost > RULES.maxMana)
            throw new Error(`Mana không hợp lệ: ${hero.id}`);
        const ability = ABILITIES[hero.id];
        if (!ability || !ability.effects.length)
            throw new Error(`Thiếu kỹ năng: ${hero.id}`);
        for (const effect of ability.effects) {
            if (!Number.isFinite(effect.amount) || effect.amount < 0)
                throw new Error(`Giá trị kỹ năng không hợp lệ: ${hero.id}`);
            if (effect.duration !== undefined && (!Number.isFinite(effect.duration) || effect.duration <= 0))
                throw new Error(`Thời lượng kỹ năng không hợp lệ: ${hero.id}`);
        }
    }
    for (const deck of [DEFAULT_DECK, ENEMY_DECK]) {
        if (deck.length !== 4 || new Set(deck).size !== 4 || deck.some(id => !ids.has(id)))
            throw new Error('Deck mặc định phải có đúng 4 tướng hợp lệ.');
    }
    if (LANES.length !== 3 || new Set(LANES).size !== 3 || LANES.some(lane => !Number.isFinite(lane)))
        throw new Error('Bản đồ phải giữ đúng ba lane đã được chốt.');
}
