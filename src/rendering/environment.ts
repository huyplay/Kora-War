import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANES } from '../data/index';
import { part, seeded } from './resources';
export interface ArenaScene {
    scene: THREE.Scene;
    coreCrystals: THREE.Mesh[];
    towerMeshes: Map<string, THREE.Group>;
    baseGroups: THREE.Group[];
}
export function buildEnvironment(world: ArenaScene) {
    const staticGroup = new THREE.Group();
    world.scene.add(staticGroup);
    const rand = seeded();
    const floor = part(staticGroup, 'cylinder', 0x365449, 0, -.75, 0, 22, 1.5, 12);
    floor.rotation.y = Math.PI / 8;
    part(staticGroup, 'box', 0x43634d, 0, -.17, 0, 33, .55, 17.5);
    part(staticGroup, 'box', 0x2d5756, 0, .001, 0, 3.4, .05, 19);
    for (let i = 0; i < 30; i++) {
        const ripple = part(staticGroup, 'box', i % 2 ? 0x427a73 : 0x355f61, (rand() - .5) * 2.8, .037, (rand() - .5) * 18, .025, .01, .3 + rand() * 1.5);
        ripple.rotation.y = .16;
    }
    for (let lane = 0; lane < 3; lane++) {
        const z = LANES[lane];
        part(staticGroup, 'box', 0x7e8976, 0, .02, z, 28, .18, 2.7);
        for (let x = -13; x < 14; x += .95)
            for (let r = 0; r < 3; r++) {
                const tile = part(staticGroup, 'box', [0x999e85, 0x8a947d, 0x85907c][Math.floor(rand() * 3)], x, .14, z + (r - 1) * .79, .87, .09, .72);
                tile.rotation.y = (rand() - .5) * .04;
            }
        for (const x of [-1.65, 1.65]) {
            part(staticGroup, 'box', 0xb5b49a, x, .29, z, .16, .5, 3.3);
            for (const dz of [-1.65, 1.65]) {
                part(staticGroup, 'box', 0x747f6b, x, .68, z + dz, .32, 1.25, .32);
                part(staticGroup, 'cone', 0xccc9aa, x, 1.4, z + dz, .29, .25, .29);
            }
        }
        // Carved approach lines and team insignias.
        for (const side of [0, 1]) {
            const color = side === 0 ? 0x83dac4 : 0xd68d7b, sign = side === 0 ? -1 : 1;
            for (let i = 0; i < 3; i++)
                part(staticGroup, 'crystal', color, sign * (5.5 + i * .45), .22, z, .1, .035, .2, .25);
        }
    }
    for (let i = 0; i < 145; i++) {
        const x = (rand() - .5) * 40, z = (rand() - .5) * 23;
        if (Math.abs(x) < 15.5 && LANES.some(l => Math.abs(z - l) < 1.9))
            continue;
        if (Math.abs(x) < 2 || Math.abs(x) > 21 || Math.abs(x) > 13.5 && Math.abs(z) < 3.3)
            continue;
        const size = .6 + rand() * 1.05;
        part(staticGroup, 'cylinder', 0x5c5340, x, .65 * size, z, .15 * size, 1.4 * size, .15 * size);
        const colors = [0x365f4b, 0x426f4e, 0x547c55, 0x617e52, 0x2f6757];
        if (i % 3 === 0) {
            for (let j = 0; j < 3; j++)
                part(staticGroup, 'cone', colors[i % 5], x, (1.15 + j * .6) * size, z, (1.0 - j * .2) * size, 1.4 * size, (1 - j * .2) * size);
        }
        else {
            part(staticGroup, 'orb', colors[i % 5], x, 1.7 * size, z, 1.0 * size, 1.1 * size, .9 * size);
            part(staticGroup, 'orb', colors[(i + 1) % 5], x + .35 * size, 2.25 * size, z - .1, .7 * size, .7 * size, .7 * size);
        }
        part(staticGroup, 'orb', 0x647364, x + .4, .14, z + .5, .35, .25, .4);
    }
    for (let i = 0; i < 60; i++) {
        const x = (rand() - .5) * 33, z = (rand() - .5) * 17;
        if (LANES.some(l => Math.abs(z - l) < 1.7) || Math.abs(x) < 2)
            continue;
        part(staticGroup, 'orb', 0x597354, x, .13, z, .45, .2, .4);
        if (i % 3 === 0)
            part(staticGroup, 'crystal', 0x8fb4a7, x, .37, z, .09, .22, .08, .2);
    }
    // Keep fallback bases separate so an imported prefab can replace their visuals.
    for (const side of [0, 1]) {
        const x = side === 0 ? -15 : 15, color = side === 0 ? 0x65dccc : 0xe5a287;
        const base = new THREE.Group();
        world.scene.add(base);
        world.baseGroups.push(base);
        part(base, 'cylinder', 0x647c75, x, .05, 0, 2.7, .65, 3);
        part(base, 'cylinder', 0xb4b49a, x, .47, 0, 1.85, .25, 2.15);
        part(base, 'cylinder', 0x627675, x, .8, 0, 1.25, .6, 1.4);
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + Math.PI / 4;
            part(base, 'box', 0x8e9c8c, x + Math.cos(a) * 1.45, 1.2, Math.sin(a) * 1.45, .36, 1.6, .36);
            part(base, 'crystal', color, x + Math.cos(a) * 1.45, 2.25, Math.sin(a) * 1.45, .27, .6, .27, .4);
        }
        const crystal = part(world.scene, 'crystal', color, x, 2.25, 0, .8, 1.55, .8, .5);
        world.coreCrystals.push(crystal);
        const orbit = part(base, 'ring', color, x, 1.7, 0, 1.55, 1.55, 1.55, .5);
        orbit.rotation.x = Math.PI / 2;
        for (const z of [-6.8, 6.8]) {
            part(staticGroup, 'box', 0x64736a, x, 1.1, z, .8, 2.5, .8);
            const banner = part(staticGroup, 'box', side === 0 ? 0x3b8682 : 0x965c55, x + .6, 1.5, z, 1.2, 1.5, .07);
            banner.rotation.y = .12;
            part(staticGroup, 'crystal', 0xdcd0aa, x + .6, 1.58, z + .06, .2, .38, .04);
        }
        for (let lane = 0; lane < 3; lane++) {
            const tower = new THREE.Group();
            tower.position.set(side === 0 ? -9 : 9, 0, LANES[lane]);
            part(tower, 'cylinder', 0x5b6c66, 0, .12, 0, .67, .32, .67);
            part(tower, 'cylinder', 0x9aab9a, 0, .66, 0, .43, .9, .43);
            part(tower, 'cylinder', 0xbec2a7, 0, 1.15, 0, .65, .24, .65);
            part(tower, 'crystal', color, 0, 1.83, 0, .38, .65, .38, .35);
            for (const a of [-1, 1])
                part(tower, 'box', 0x697d75, a * .44, 1.42, 0, .14, .65, .16);
            world.scene.add(tower);
            world.towerMeshes.set(`${side}-${lane}`, tower);
        }
    }
    // Merge static props per material: hundreds of terrain objects become a few draw calls.
    staticGroup.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    staticGroup.traverse(o => {
        if (o instanceof THREE.Mesh) {
            const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
            const m = o.material as THREE.Material;
            if (!batches.has(m))
                batches.set(m, []);
            batches.get(m)!.push(g);
        }
    });
    world.scene.remove(staticGroup);
    for (const [m, geometries] of batches) {
        const g = mergeGeometries(geometries);
        if (g) {
            const mesh = new THREE.Mesh(g, m);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            world.scene.add(mesh);
        }
        geometries.forEach(g => g.dispose());
    }
}
