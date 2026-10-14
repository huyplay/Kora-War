import * as THREE from 'three';
import type { GameEvent } from '../../core/types';
import type { ContentConfig } from '../../data/content';
import { LANES } from '../../data/map';
import { ObjectPool } from '../../engine/object-pool';
import { VFX_EVENTS, type SpriteBinding, type VfxEvent } from '../../data/media';
import { SPELLS } from '../../data/spells';
interface Particle {
  sprite: THREE.Sprite;
  age: number;
  duration: number;
  size: number;
  frames: THREE.Texture[];
  fromX?: number;
  toX?: number;
  rotate?: boolean;
}
/** Pooled event atlases with a procedural fallback and guarded asynchronous asset loading. */
export class SpriteEffects {
  readonly root = new THREE.Group();
  private frames: THREE.Texture[] = [];
  private fallbackFrames: THREE.Texture[] = [];
  private eventFrames = new Map<string, THREE.Texture[]>();
  private lastHit = new Map<string, number>();
  private generation = 0;
  private particles: Particle[] = [];
  private pool: ObjectPool<Particle>;
  private profile?: ContentConfig['vfx'];
  private disposed = false;
  configure(profile: ContentConfig['vfx']) {
    this.reset();
    const generation = ++this.generation;
    if (this.frames !== this.fallbackFrames) this.frames.forEach((frame) => frame.dispose());
    this.frames = this.fallbackFrames;
    this.eventFrames.forEach((frames) => frames.forEach((frame) => frame.dispose()));
    this.eventFrames.clear();
    this.profile = profile;
    const load = async (binding: SpriteBinding, event?: string) => {
      let texture: THREE.Texture | undefined;
      try {
        texture = await new THREE.TextureLoader().loadAsync(`/api/assets/${binding.assetId}`);
        if (this.disposed || generation !== this.generation) return;
        const image = texture.image as { width: number; height: number };
        if (image.width % binding.columns || image.height % binding.rows) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        const frames: THREE.Texture[] = [];
        const { columns, rows } = binding;
        for (let i = 0; i < columns * rows; i++) {
          const frame = texture.clone();
          frame.repeat.set(1 / columns, 1 / rows);
          frame.offset.set((i % columns) / columns, 1 - (Math.floor(i / columns) + 1) / rows);
          frame.needsUpdate = true;
          frames.push(frame);
        }
        if (event) this.eventFrames.set(event, frames);
        else this.frames = frames;
      } catch {
        /* Keep the loaded global or procedural atlas when an asset fails. */
      } finally {
        texture?.dispose();
      }
    };
    if (profile.spriteAssetId)
      void load({
        assetId: profile.spriteAssetId,
        columns: profile.spriteColumns || 8,
        rows: profile.spriteRows || 1,
        fps: 12,
      });
    for (const [event, binding] of Object.entries(profile.eventSprites || {}))
      void load(binding, event as VfxEvent);
    for (const [id, binding] of Object.entries(profile.spellSprites || {})) void load(binding, `spell:${id}`);
  }
  constructor() {
    this.root.name = 'SpriteEffects';
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    for (let frame = 0; frame < 8; frame++) {
      const p = frame / 7,
        x = frame * 128 + 64;
      const glow = ctx.createRadialGradient(x, 64, 0, x, 64, 60);
      glow.addColorStop(0, `rgba(255,255,255,${0.85 * (1 - p)})`);
      glow.addColorStop(0.45, 'rgba(255,255,255,.25)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(frame * 128, 0, 128, 128);
      ctx.strokeStyle = `rgba(255,255,255,${1 - p * 0.8})`;
      ctx.lineWidth = 4 * (1 - p) + 1;
      ctx.beginPath();
      ctx.arc(x, 64, 10 + p * 46, 0, Math.PI * 2);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    for (let i = 0; i < 8; i++) {
      const frame = texture.clone();
      frame.repeat.set(1 / 8, 1);
      frame.offset.set(i / 8, 0);
      frame.needsUpdate = true;
      this.frames.push(frame);
    }
    texture.dispose();
    this.fallbackFrames = this.frames;
    this.pool = new ObjectPool(
      48,
      () => {
        const material = new THREE.SpriteMaterial({
          map: this.frames[0],
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(material);
        sprite.visible = false;
        this.root.add(sprite);
        return { sprite, age: 0, duration: 0.6, size: 2, frames: this.frames };
      },
      (p) => {
        p.sprite.visible = false;
      },
      (p) => p.sprite.material.dispose(),
    );
  }
  emit(event: GameEvent): void {
    if (!(VFX_EVENTS as readonly string[]).includes(event.type)) return;
    if (event.type === 'hit') {
      const key = `${event.side}:${event.lane}`;
      if (event.time - (this.lastHit.get(key) ?? -Infinity) < 0.09) return;
      this.lastHit.set(key, event.time);
    }
    const particle = this.pool.acquire();
    if (!particle) return;
    particle.age = 0;
    const kind = event.type as VfxEvent;
    const spell =
      event.type === 'skill' && !event.heroId
        ? Object.values(SPELLS).find((s) => s.name === event.label)
        : undefined;
    const slot = spell ? `spell:${spell.id}` : kind;
    particle.frames = this.eventFrames.get(slot) || this.eventFrames.get(kind) || this.frames;
    const binding = spell ? this.profile?.spellSprites?.[spell.id] : this.profile?.eventSprites?.[kind];
    particle.duration = binding
      ? Math.min(2, particle.frames.length / binding.fps)
      : event.type === 'pulse'
        ? 1
        : 0.65;
    particle.sprite.material.map = particle.frames[0];
    particle.size =
      (event.type === 'pulse'
        ? 4.5
        : event.type === 'hit'
          ? 0.85
          : event.type === 'projectile'
            ? 0.9
            : ['spawn', 'heal', 'death'].includes(event.type)
              ? 1.6
              : 2.3) * (this.profile?.intensity || 1);
    particle.fromX = event.x;
    particle.toX = event.type === 'projectile' ? event.toX : undefined;
    particle.rotate = !binding;
    if (event.type === 'projectile') particle.duration = 0.22;
    particle.sprite.position.set(event.x, 1, LANES[event.lane]);
    particle.sprite.visible = true;
    particle.sprite.material.rotation = 0;
    particle.sprite.material.color.set(
      binding
        ? '#ffffff'
        : event.type === 'heal'
          ? this.profile?.heal || '#70ffc7'
          : event.side === 0
            ? this.profile?.ally || '#7ddcff'
            : this.profile?.enemy || '#ffa075',
    );
    this.particles.push(particle);
  }
  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      const progress = p.age / p.duration;
      if (progress >= 1) {
        this.pool.release(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.sprite.material.map = p.frames[Math.min(p.frames.length - 1, Math.floor(progress * p.frames.length))];
      p.sprite.material.opacity = Math.min(1, (1 - progress) * 3);
      p.sprite.material.rotation = p.rotate ? progress * 0.8 : 0;
      p.sprite.scale.setScalar(p.size * (0.85 + Math.sin(progress * Math.PI) * 0.15));
      if (p.toX !== undefined) {
        p.sprite.position.x = THREE.MathUtils.lerp(p.fromX!, p.toX, progress);
        p.sprite.position.y = 1.15 + Math.sin(progress * Math.PI) * 0.25;
      }
    }
  }
  get activeCount(): number {
    return this.pool.used;
  }
  reset(): void {
    this.lastHit.clear();
    this.pool.clear();
    this.particles = [];
  }
  dispose(): void {
    this.disposed = true;
    this.generation++;
    this.reset();
    this.pool.dispose();
    new Set([...this.frames, ...this.fallbackFrames, ...[...this.eventFrames.values()].flat()]).forEach(
      (frame) => frame.dispose(),
    );
    this.eventFrames.clear();
    this.root.clear();
  }
}
