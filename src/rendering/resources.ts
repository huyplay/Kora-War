import * as THREE from 'three';
export const materialCache = new Map<string, THREE.MeshLambertMaterial>();
export const geometryCache = new Map<string, THREE.BufferGeometry>();
export const heroStaticCache = new Map<string, {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
}[]>();
export const unitRingGeometry = new THREE.RingGeometry(.43, .5, 24);
export const healthGeometry = new THREE.PlaneGeometry(1, 1);
export const teamRings = [0x68e5d0, 0xff8e81].map(color => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: .8 }));
export const healthMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
export function mat(color: number, emissive = 0) {
    const key = `${color}/${emissive}`;
    if (!materialCache.has(key))
        materialCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: color, emissiveIntensity: emissive }));
    return materialCache.get(key)!;
}
export function geo(kind: string) {
    if (!geometryCache.has(kind))
        geometryCache.set(kind, kind === 'box' ? new THREE.BoxGeometry(1, 1, 1) : kind === 'orb' ? new THREE.IcosahedronGeometry(1, 1) : kind === 'cone' ? new THREE.ConeGeometry(1, 1, 6) : kind === 'crystal' ? new THREE.OctahedronGeometry(1) : kind === 'ring' ? new THREE.TorusGeometry(1, .04, 4, 32) : new THREE.CylinderGeometry(1, 1, 1, 8));
    return geometryCache.get(kind)!;
}
export function part(parent: THREE.Object3D, kind: string, color: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, emissive = 0) { const mesh = new THREE.Mesh(geo(kind), mat(color, emissive)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; }
export function seeded() { let seed = 45198; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
/** One World owns these caches. A match reset reuses them; app shutdown releases them. */
export function disposeSharedResources() {
    materialCache.forEach(material => material.dispose());
    geometryCache.forEach(geometry => geometry.dispose());
    heroStaticCache.forEach(parts => parts.forEach(part => part.geometry.dispose()));
    unitRingGeometry.dispose();
    healthGeometry.dispose();
    teamRings.forEach(material => material.dispose());
    healthMaterial.dispose();
    materialCache.clear();
    geometryCache.clear();
    heroStaticCache.clear();
}
