import { HERO_MAP } from './heroes';
export function traits(deck: string[]) {
    const counts: Record<string, number> = {};
    for (const id of deck) {
        const h = HERO_MAP[id];
        if (h) {
            counts[h.origin] = (counts[h.origin] || 0) + 1;
            counts[h.role] = (counts[h.role] || 0) + 1;
        }
    }
    return counts;
}
