import * as THREE from 'three';

/** One draw call for all contact shadows, including the low graphics preset. */
export class ContactShadows {
  readonly root: THREE.InstancedMesh;
  private texture: THREE.DataTexture;
  private dummy = new THREE.Object3D();
  constructor() {
    const size = 64,
      pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const radius = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
        const offset = (y * size + x) * 4;
        pixels[offset + 3] = Math.round(Math.pow(Math.max(0, 1 - radius), 1.65) * 150);
      }
    this.texture = new THREE.DataTexture(pixels, size, size);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.needsUpdate = true;
    this.root = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
      100,
    );
    this.root.name = 'UnitContactShadows';
    this.root.frustumCulled = false;
    this.root.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.count = 0;
  }
  begin() {
    this.root.count = 0;
  }
  add(position: THREE.Vector3, size: number, born: number) {
    if (this.root.count >= 100) return;
    this.dummy.position.set(position.x, 0.075, position.z);
    this.dummy.rotation.set(-Math.PI / 2, 0, 0);
    this.dummy.scale.set(size * born, size * 0.65 * born, 1);
    this.dummy.updateMatrix();
    this.root.setMatrixAt(this.root.count++, this.dummy.matrix);
  }
  end() {
    this.root.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.root.removeFromParent();
    this.root.geometry.dispose();
    (this.root.material as THREE.Material).dispose();
    this.texture.dispose();
    this.root.dispose();
  }
}
