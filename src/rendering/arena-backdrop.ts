import * as THREE from 'three';

/** An infinite-distance matte behind real 3D geometry, with cover framing and night grading. */
export class ArenaBackdrop {
  readonly root = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  private texture?: THREE.Texture;
  private generation = 0;
  private crop = 1;
  private direction = new THREE.Vector3();
  constructor() {
    this.root.name = 'ElyndraValleyBackdrop';
    this.root.renderOrder = -100;
    this.root.visible = false;
    this.root.frustumCulled = false;
  }
  async configure(
    assetId: string | undefined,
    night: boolean,
    loader = (url: string) => new THREE.TextureLoader().loadAsync(url),
    crop = 1,
  ) {
    const generation = ++this.generation;
    this.crop = THREE.MathUtils.clamp(crop, 0.35, 1);
    this.root.material.color.setHex(night ? 0x536d9b : 0xffffff);
    this.root.visible = false;
    this.texture?.dispose();
    this.texture = undefined;
    this.root.material.map = null;
    if (!assetId) return;
    try {
      const texture = await loader(`/api/assets/${assetId}`);
      if (generation !== this.generation) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.y = this.crop;
      texture.anisotropy = 4;
      this.texture = texture;
      this.root.material.map = texture;
      this.root.material.needsUpdate = true;
      this.root.visible = true;
    } catch {
      /* A missing optional backdrop keeps the configured sky/fog color. */
    }
  }
  update(camera: THREE.PerspectiveCamera) {
    if (!this.texture) return;
    const distance = Math.min(120, camera.far * 0.8);
    const height = (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / camera.zoom;
    const image = this.texture.image as { width?: number; height?: number } | undefined;
    const aspect = image?.width && image.height ? image.width / (image.height * this.crop) : 3;
    const cover = Math.max(1, camera.aspect / aspect);
    this.root.scale.set(height * aspect * cover, height * cover, 1);
    this.root.quaternion.copy(camera.quaternion);
    this.root.position
      .copy(camera.position)
      .addScaledVector(camera.getWorldDirection(this.direction), distance);
  }
  dispose() {
    this.generation++;
    this.texture?.dispose();
    this.texture = undefined;
    this.root.removeFromParent();
    this.root.geometry.dispose();
    this.root.material.dispose();
  }
}
