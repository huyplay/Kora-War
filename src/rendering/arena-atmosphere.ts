import { LANES } from '../data/map';
import * as THREE from 'three';

/** Small, bounded scenery animation. Textures are local, mipmapped and shared. */
export class ArenaAtmosphere {
  readonly root = new THREE.Group();
  private banners: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>[] = [];
  private flames: THREE.Sprite[] = [];
  private seals: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private textures: THREE.CanvasTexture[] = [];
  private embers = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffbb62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
    24,
  );
  private dummy = new THREE.Object3D();
  constructor() {
    this.root.name = 'AnimatedArenaClothAndTorches';
    const sealGeometry = new THREE.PlaneGeometry(2.15, 2.15);
    const sealTexture = this.seal();
    for (const side of [0, 1]) {
      const material = new THREE.MeshBasicMaterial({
        map: sealTexture,
        color: side ? 0xff9a82 : 0x8fddff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.38,
      });
      const seals = new THREE.InstancedMesh(sealGeometry, material, LANES.length);
      seals.name = 'GateAetherSeals';
      for (let lane = 0; lane < LANES.length; lane++) {
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.position.set(side ? 13.1 : -13.1, 0.085, LANES[lane]);
        this.dummy.updateMatrix();
        seals.setMatrixAt(lane, this.dummy.matrix);
      }
      this.dummy.rotation.set(0, 0, 0);
      this.seals.push(seals);
      this.root.add(seals);
    }
    for (const side of [0, 1]) {
      const texture = this.cloth(side);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.92,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
      });
      for (const z of [-7.1, 7.1]) {
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.7, 8, 16), material);
        banner.position.set(side ? 15.3 : -15.3, 1.8, z + 0.76);
        this.banners.push(banner);
        this.root.add(banner);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 36, 1, 32, 32, 30);
    gradient.addColorStop(0, '#fff8c9');
    gradient.addColorStop(0.22, '#ffdf76');
    gradient.addColorStop(0.5, '#ef752acc');
    gradient.addColorStop(1, '#ef752a00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const fire = new THREE.CanvasTexture(canvas);
    fire.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(fire);
    const flameMaterial = new THREE.SpriteMaterial({
      map: fire,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (const x of [-12.7, 12.7])
      for (const z of [-6.5, 6.5]) {
        const flame = new THREE.Sprite(flameMaterial);
        flame.position.set(x, 1.53, z);
        this.flames.push(flame);
        this.root.add(flame);
      }
    this.embers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.embers.frustumCulled = false;
    this.root.add(this.embers);
  }
  private seal() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (const radius of [92, 107]) {
      ctx.beginPath();
      ctx.arc(128, 128, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.translate(128, 128);
      ctx.rotate((i * Math.PI) / 6);
      ctx.beginPath();
      ctx.moveTo(-4, 96);
      ctx.lineTo(0, 102);
      ctx.lineTo(4, 96);
      ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(128, 89);
    ctx.lineTo(152, 128);
    ctx.lineTo(128, 167);
    ctx.lineTo(104, 128);
    ctx.closePath();
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }
  private cloth(side: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.lineTo(128, 450);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = side ? '#982d3e' : '#1c55a0';
    ctx.fillRect(0, 0, 256, 512);
    // Fine woven threads stay subtle at normal zoom; mipmaps prevent shimmer.
    for (let x = 0; x < 256; x += 3) {
      ctx.fillStyle = x % 2 ? '#ffffff0d' : '#00000018';
      ctx.fillRect(x, 0, 1, 512);
    }
    ctx.fillStyle = '#ffffff09';
    for (let y = 0; y < 512; y += 4) ctx.fillRect(0, y, 256, 1);
    const folds = ctx.createLinearGradient(0, 0, 256, 0);
    for (let i = 0; i <= 8; i++) folds.addColorStop(i / 8, i % 2 ? '#00000030' : '#ffffff12');
    ctx.fillStyle = folds;
    ctx.fillRect(0, 0, 256, 512);
    ctx.strokeStyle = '#d8b778';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(13, 9);
    ctx.lineTo(243, 9);
    ctx.lineTo(243, 491);
    ctx.lineTo(128, 430);
    ctx.lineTo(13, 491);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 17, 212, 474);
    ctx.beginPath();
    ctx.moveTo(128, 137);
    ctx.lineTo(190, 239);
    ctx.lineTo(128, 343);
    ctx.lineTo(66, 239);
    ctx.closePath();
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#c5f0ff';
    ctx.beginPath();
    ctx.moveTo(128, 185);
    ctx.lineTo(151, 239);
    ctx.lineTo(128, 291);
    ctx.lineTo(105, 239);
    ctx.closePath();
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.textures.push(texture);
    return texture;
  }
  update(time: number, camera: THREE.Camera, low: boolean) {
    this.banners.forEach((banner, index) => {
      const positions = banner.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const free = (1.35 - positions.getY(i)) / 2.7;
        positions.setZ(
          i,
          free * (0.08 + Math.sin(time * 2.3 + free * 4 + positions.getX(i) * 3 + index) * 0.085),
        );
      }
      positions.needsUpdate = true;
      banner.geometry.computeVertexNormals();
    });
    this.seals.forEach((seal, i) => {
      seal.material.opacity = 0.34 + Math.sin(time * 1.4 + i) * 0.04;
    });
    this.flames.forEach((flame, i) => {
      const flicker = Math.sin(time * 11 + i * 2) * 0.07 + Math.sin(time * 17 + i) * 0.035;
      flame.scale.set(0.62 + flicker, 1.1 - flicker, 1);
    });
    this.embers.count = low ? 12 : 24;
    for (let i = 0; i < this.embers.count; i++) {
      const source = this.flames[i % 4].position;
      const p = (time * (0.38 + (i % 3) * 0.07) + i * 0.173) % 1;
      this.dummy.position.set(
        source.x + Math.sin(time + i) * p * 0.25,
        source.y + p * 1.55,
        source.z + Math.cos(i * 2) * p * 0.2,
      );
      this.dummy.quaternion.copy(camera.quaternion);
      this.dummy.scale.setScalar(Math.sin(p * Math.PI) * 0.045);
      this.dummy.updateMatrix();
      this.embers.setMatrixAt(i, this.dummy.matrix);
    }
    this.embers.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.root.removeFromParent();
    const materials = new Set<THREE.Material>();
    this.banners.forEach((banner) => {
      banner.geometry.dispose();
      materials.add(banner.material);
    });
    this.flames.forEach((flame) => materials.add(flame.material));
    this.seals.forEach((seal) => {
      materials.add(seal.material);
      seal.dispose();
    });
    this.seals[0]?.geometry.dispose();
    materials.forEach((material) => material.dispose());
    this.embers.geometry.dispose();
    this.embers.material.dispose();
    this.embers.dispose();
    this.textures.forEach((texture) => texture.dispose());
  }
}
