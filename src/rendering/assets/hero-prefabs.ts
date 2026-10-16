import type { Group } from 'three';
import { HEROES } from '../../data/heroes';
import type { Hero } from '../../data/types';
import { AssetRegistry } from '../../engine/assets/asset-registry';
import { createHero } from '../hero-model';
export type HeroPrefab = (side?: number) => Group;
export function createHeroPrefabs(heroes: readonly Hero[] = HEROES): AssetRegistry<HeroPrefab> {
  const registry = new AssetRegistry<HeroPrefab>();
  for (const hero of heroes)
    registry.register({ id: hero.id, create: () => (side) => createHero(hero, side) });
  return registry;
}
