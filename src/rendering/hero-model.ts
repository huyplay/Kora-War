import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Hero } from '../data/index';
import { heroStaticCache, part, teamRings, unitRingGeometry } from './resources';
export function createHero(h: Hero, side = 0) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const bulk = h.role === 'guardian' ? 1.25 : h.id === 'nyx' ? .8 : 1;
    const armor = h.color, trim = h.accent, dark = 0x263842, skin = h.id === 'brann' ? 0x9a7c53 : 0xd6ba9e;
    // Hand-built low-poly miniatures: independent limbs, armour, cloaks and weapons.
    const leftLeg = part(body, 'box', dark, -.18, .37, 0, .22, .62, .26), rightLeg = part(body, 'box', dark, .18, .37, 0, .22, .62, .26);
    part(body, 'box', armor, -.19, .13, .09, .27, .2, .45);
    part(body, 'box', armor, .19, .13, .09, .27, .2, .45);
    part(body, 'cone', armor, 0, .78, 0, .43, .55, .35).rotation.z = Math.PI;
    part(body, 'box', armor, 0, 1.12, 0, .64 * bulk, .7, .42 * bulk);
    part(body, 'box', trim, 0, .91, .03, .7 * bulk, .1, .48);
    part(body, 'crystal', trim, 0, 1.25, .24, .12, .18, .08, .25);
    part(body, 'orb', armor, -.43 * bulk, 1.34, 0, .24, .19, .25);
    part(body, 'orb', armor, .43 * bulk, 1.34, 0, .24, .19, .25);
    part(body, 'box', skin, 0, 1.69, 0, .4, .42, .36);
    part(body, 'cone', dark, 0, 1.9, -.02, .34, .38, .3);
    part(body, 'box', trim, -.105, 1.72, .19, .095, .055, .035, 1);
    part(body, 'box', trim, .105, 1.72, .19, .095, .055, .035, 1);
    const cape = part(body, 'box', armor, 0, 1.03, -.27, .65, 1.05, .06);
    cape.rotation.x = -.15;
    const armL = new THREE.Group();
    armL.position.set(-.43, 1.26, 0);
    body.add(armL);
    part(armL, 'box', armor, 0, -.2, 0, .2, .5, .22);
    part(armL, 'orb', skin, 0, -.47, .03, .12, .13, .12);
    const armR = new THREE.Group();
    armR.position.set(.43, 1.26, 0);
    body.add(armR);
    part(armR, 'box', armor, 0, -.2, 0, .2, .5, .22);
    part(armR, 'orb', skin, 0, -.47, .03, .12, .13, .12);
    if (h.weapon === 'sword' || h.weapon === 'daggers') {
        part(armR, 'box', 0xe0e7de, .03, -.14, .27, .11, h.weapon === 'daggers' ? .58 : 1.1, .09).rotation.x = .22;
        part(armR, 'box', trim, .03, -.5, .22, .38, .08, .12);
        if (h.weapon === 'daggers')
            part(armL, 'box', trim, 0, -.14, .27, .1, .65, .09, .15);
        else {
            part(armL, 'box', armor, -.07, -.32, .19, .48, .68, .12);
            part(armL, 'crystal', trim, -.07, -.3, .29, .21, .32, .05, .15);
        }
    }
    else if (h.weapon === 'bow') {
        const bow = part(armL, 'ring', trim, -.12, -.2, .22, .42, .68, .5);
        bow.rotation.y = Math.PI / 2;
        part(armL, 'box', 0xbecbc6, -.12, -.2, .22, .025, 1.22, .025);
        const quiver = part(body, 'cylinder', dark, .23, 1.15, -.4, .17, .8, .17);
        quiver.rotation.z = .25;
        for (let i = 0; i < 3; i++)
            part(body, 'box', trim, .12 + i * .09, 1.64, -.4, .02, .52, .02);
    }
    else if (h.weapon === 'staff') {
        part(armR, 'cylinder', 0x9c855a, .08, -.05, .2, .045, 1.95, .045);
        part(armR, 'ring', trim, .08, .9, .2, .25, .3, .25, .2);
        part(armR, 'crystal', trim, .08, .91, .2, .18, .32, .18, .8);
        part(body, 'cone', armor, 0, 1.98, 0, .36, .55, .36);
    }
    else {
        part(armR, 'cylinder', 0x816844, .15, -.24, .23, .07, 1.4, .07).rotation.z = -.25;
        part(armR, 'box', armor, .25, .36, .23, .68, .43, .48);
        part(armR, 'crystal', trim, .25, .36, .48, .18, .19, .05, .4);
    }
    if (h.id === 'brann') {
        for (const s of [-1, 1]) {
            const branch = part(body, 'cone', 0x80664c, s * .35, 2.01, -.02, .09, .68, .08);
            branch.rotation.z = -s * .6;
            part(body, 'orb', 0x799852, s * .53, 2.25, 0, .32, .22, .29);
        }
    }
    if (h.id === 'kael')
        for (const s of [-1, 1])
            part(body, 'crystal', trim, s * .3, 1.9, 0, .09, .36, .1, .2).rotation.z = -s * .35;
    if (h.id === 'aurelia') {
        const halo = part(body, 'ring', trim, 0, 2.15, -.04, .36, .36, .36, .6);
        halo.rotation.x = .2;
    }
    const fixed = body.children.filter(o => o instanceof THREE.Mesh && o !== leftLeg && o !== rightLeg && o !== cape) as THREE.Mesh[];
    if (!heroStaticCache.has(h.id)) {
        body.updateMatrixWorld(true);
        const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
        for (const o of fixed) {
            const m = o.material as THREE.Material, g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
            if (!batches.has(m))
                batches.set(m, []);
            batches.get(m)!.push(g);
        }
        const cached: {
            geometry: THREE.BufferGeometry;
            material: THREE.Material;
        }[] = [];
        for (const [m, gs] of batches) {
            const merged = mergeGeometries(gs);
            if (merged)
                cached.push({ geometry: merged, material: m });
            gs.forEach(g => g.dispose());
        }
        heroStaticCache.set(h.id, cached);
    }
    for (const o of fixed)
        body.remove(o);
    for (const b of heroStaticCache.get(h.id)!) {
        const mesh = new THREE.Mesh(b.geometry, b.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        body.add(mesh);
    }
    const ring = new THREE.Mesh(unitRingGeometry, teamRings[side]);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .035;
    group.add(ring);
    group.userData = { body, leftLeg, rightLeg, armL, armR, cape, ring };
    return group;
}
