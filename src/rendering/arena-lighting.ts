import * as THREE from 'three';
import type { ArenaPresentation } from '../data/arena-presentation';
/** Shared sunlight/moonlight and four local, shadow-free torch lights. */
export class ArenaLighting {
  readonly root = new THREE.Group();
  readonly sky = new THREE.HemisphereLight();
  readonly key = new THREE.DirectionalLight();
  readonly rim = new THREE.DirectionalLight();
  readonly torches: THREE.PointLight[] = [];
  constructor() {
    this.root.name = 'ArenaDayNightLighting';
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    Object.assign(this.key.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 0.5, far: 85 });
    this.key.shadow.normalBias = 0.07;
    this.root.add(this.sky, this.key, this.rim);
    for (const x of [-12.7, 12.7])
      for (const z of [-6.5, 6.5]) {
        const torch = new THREE.PointLight(0xffb869, 0, 10, 2);
        torch.position.set(x, 2.1, z);
        this.torches.push(torch);
        this.root.add(torch);
      }
  }
  configure(config: ArenaPresentation['lighting']) {
    const day = config.mode === 'day';
    this.sky.color.set(day ? 0xe2efff : 0x9dbbff);
    this.sky.groundColor.set(day ? 0x7b7666 : 0x354459);
    this.sky.intensity = day ? config.dayAmbient : config.nightAmbient;
    this.key.color.set(day ? 0xffebc9 : 0xa3bdff);
    this.key.intensity = day ? config.sunIntensity : config.moonIntensity;
    this.key.position.set(day ? -12 : -6, 26, day ? 9 : -8);
    this.rim.color.set(day ? 0xc5ddff : 0x7198e3);
    this.rim.intensity = day ? 0.9 : 0.7;
    this.rim.position.set(8, 12, -14);
    for (const torch of this.torches) torch.intensity = config.torchIntensity * (day ? 0.06 : 1);
  }
  dispose() {
    this.key.shadow.dispose();
    this.root.removeFromParent();
  }
}
