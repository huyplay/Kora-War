import type { Group } from 'three';
import { HEROES } from '../../data/heroes';
import { AssetRegistry } from '../../engine/assets/asset-registry';
import { createHero } from '../hero-model';
export type HeroPrefab = (side?: number) => Group;
export function createHeroPrefabs(): AssetRegistry<HeroPrefab> {
    const registry = new AssetRegistry<HeroPrefab>();
    for (const hero of HEROES)
        registry.register({ id: hero.id, create: () => side => createHero(hero, side) });
    return registry;
}
