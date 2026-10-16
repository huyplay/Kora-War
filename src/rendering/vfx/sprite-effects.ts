import * as THREE from 'three';
import type { GameEvent, Unit } from '../../core/types';
import type { ContentConfig } from '../../data/content';
import { LANES } from '../../data/map';
import { ObjectPool } from '../../engine/object-pool';
import { VFX_EVENTS, type SpriteBinding, type VfxEvent } from '../../data/media';
import { SPELLS } from '../../data/spells';
import { healingAtlas } from './healing-atlas';
interface Particle {
  sprite: THREE.Sprite;
  age: number;
  duration: number;
  size: number;
  frames: THREE.Texture[];
  fromX?: number;
  toX?: number;
  fromZ?: number;
  toZ?: number;
  rotate?: boolean;
  opacity?: number;
  lane?: number;
  kind?: VfxEvent;
  reduced?: boolean;
  visualProgress?: number;
  unitId?: number;
  heightOffset?: number;
}
export interface SpritePlacement {
  unitId?: number;
  height?: number;
  scale?: number;
  reducedMotion?: boolean;
}
/** Pooled event atlases with a procedural fallback and guarded asynchronous asset loading. */
export class SpriteEffects {
  readonly root = new THREE.Group();
  private frames: THREE.Texture[] = [];
  private fallbackFrames: THREE.Texture[] = [];
  private healingFrames: THREE.Texture[] = [];
  private eventFrames = new Map<string, THREE.Texture[]>();
  private lastHit = new Map<string, number>();
  private lastEvent = new Map<string, number>();
  private generation = 0;
  private particles: Particle[] = [];
  private pool: ObjectPool<Particle>;
  private profile?: ContentConfig['vfx'];
  private disposed = false;
  configure(profile: ContentConfig['vfx']) {
    if (this.disposed) return;
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
    this.healingFrames = healingAtlas();
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
  get recoveryManaged() {
    return !this.disposed && !!this.profile?.readability && !!this.profile.feedback;
  }
  /** The same confirmed HP delta as floating numbers; never infer a recipient by proximity. */
  recover(
    unit: Pick<Unit, 'id' | 'side' | 'lane' | 'x'>,
    healing: number,
    time: number,
    point: { x: number; y: number; z: number },
    bodyHeight: number,
    scale: number,
    reducedMotion = false,
  ) {
    if (
      !this.recoveryManaged ||
      !Number.isFinite(healing) ||
      healing <= 0 ||
      !Number.isFinite(bodyHeight) ||
      bodyHeight <= 0 ||
      !Number.isFinite(unit.id)
    )
      return;
    this.emit(
      { id: unit.id, time, type: 'heal', side: unit.side, lane: unit.lane, x: unit.x, value: healing },
      point,
      undefined,
      { unitId: unit.id, height: point.y + bodyHeight * 0.55, scale, reducedMotion },
    );
  }
  emit(
    event: GameEvent,
    position?: { x: number; y?: number; z: number },
    target?: { x: number; z: number },
    placement?: SpritePlacement,
  ): void {
    if (this.disposed || !(VFX_EVENTS as readonly string[]).includes(event.type)) return;
    const readability = this.profile?.readability;
    const kind = event.type as VfxEvent,
      style = readability?.events[kind];
    const x = position?.x ?? event.x,
      z = position?.z ?? LANES[event.lane];
    if (
      ![x, z, position?.y ?? 0, placement?.height ?? 1, placement?.scale ?? 1].every(Number.isFinite) ||
      (placement?.scale ?? 1) <= 0 ||
      (event.time !== undefined && !Number.isFinite(event.time))
    )
      return;
    const key = `${kind}:${placement?.unitId ?? event.targetId ?? `${event.side}:${event.lane}:${Math.round(x)}`}`;
    if (style) {
      if (style.opacity <= 0 || event.time - (this.lastEvent.get(key) ?? -Infinity) < style.cooldown - 1e-8)
        return;
      if (
        kind !== 'projectile' &&
        this.particles.filter(
          (p) =>
            p.kind !== 'projectile' &&
            p.lane === event.lane &&
            Math.hypot(p.sprite.position.x - x, p.sprite.position.z - z) < readability!.areaRadius,
        ).length >= readability!.maxPerArea
      )
        return;
    } else if (event.type === 'hit') {
      const key = `${event.side}:${event.lane}`;
      if (event.time - (this.lastHit.get(key) ?? -Infinity) < 0.09) return;
      this.lastHit.set(key, event.time);
    }
    const particle = this.pool.acquire();
    if (!particle) return;
    if (style) {
      this.lastEvent.set(key, event.time);
      if (this.lastEvent.size > 512) this.lastEvent.delete(this.lastEvent.keys().next().value!);
    }
    particle.age = 0;
    const spell =
      event.type === 'skill' && !event.heroId
        ? Object.values(SPELLS).find((s) => s.name === event.label)
        : undefined;
    const slot = spell ? `spell:${spell.id}` : kind;
    const loaded = this.eventFrames.get(slot) || this.eventFrames.get(kind);
    const recoveryFallback = !!style && kind === 'heal' && !loaded;
    particle.frames = loaded || (recoveryFallback ? this.healingFrames : this.frames);
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
            : recoveryFallback
              ? 2.8
              : ['spawn', 'heal', 'death'].includes(event.type)
                ? 1.6
                : 2.3) * (this.profile?.intensity || 1);
    particle.fromX = position?.x ?? event.x;
    particle.toX = event.type === 'projectile' ? (target?.x ?? event.toX) : undefined;
    particle.fromZ = position?.z ?? LANES[event.lane];
    particle.toZ = target?.z ?? particle.fromZ;
    particle.rotate = !binding && !recoveryFallback;
    if (event.type === 'projectile') particle.duration = 0.22;
    if (style) {
      particle.duration = Math.min(particle.duration, readability!.maxDuration);
      particle.size *= style.scale * Math.max(0.25, Math.min(1.2, placement?.scale ?? 1));
    }
    particle.opacity = style?.opacity ?? 1;
    particle.lane = event.lane;
    particle.kind = kind;
    particle.reduced = !!style && !!placement?.reducedMotion;
    particle.visualProgress = 0;
    particle.unitId = style && kind === 'heal' ? placement?.unitId : undefined;
    particle.heightOffset = (placement?.height ?? 1) - (position?.y ?? 0);
    particle.sprite.material.blending =
      style?.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
    particle.sprite.material.depthTest = !(style && kind === 'heal');
    particle.sprite.renderOrder = style && kind === 'heal' ? 24 : 0;
    if (particle.sprite.material.toneMapped !== !style) {
      particle.sprite.material.toneMapped = !style;
      particle.sprite.material.needsUpdate = true;
    }
    particle.sprite.material.opacity = particle.opacity;
    particle.sprite.scale.setScalar(particle.size * 0.85);
    particle.sprite.position.set(x, style ? (placement?.height ?? 1) : 1, z);
    particle.sprite.visible = true;
    particle.sprite.material.rotation = 0;
    particle.sprite.material.color.set(
      loaded
        ? '#ffffff'
        : event.type === 'heal'
          ? this.profile?.heal || '#70ffc7'
          : event.side === 0
            ? this.profile?.ally || '#7ddcff'
            : this.profile?.enemy || '#ffa075',
    );
    this.particles.push(particle);
  }
  update(
    dt: number,
    reducedMotion = false,
    position?: (id: number) => { x: number; y?: number; z: number } | undefined,
  ): void {
    if (this.disposed) return;
    dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      const progress = p.age / p.duration;
      if (progress >= 1) {
        this.pool.release(p);
        this.particles.splice(i, 1);
        continue;
      }
      // Switching the preference mid-effect must not restart motion on the next frame.
      p.reduced ||= !!this.profile?.readability && reducedMotion;
      const visualProgress = p.reduced ? p.visualProgress! : progress;
      p.visualProgress = visualProgress;
      p.sprite.material.map =
        p.frames[Math.min(p.frames.length - 1, Math.floor(visualProgress * p.frames.length))];
      p.sprite.material.opacity = (p.opacity ?? 1) * Math.min(1, (1 - progress) * 3);
      p.sprite.material.rotation = p.rotate ? visualProgress * 0.8 : 0;
      p.sprite.scale.setScalar(p.size * (0.85 + Math.sin(visualProgress * Math.PI) * 0.15));
      if (dt > 0 && p.unitId !== undefined && !p.reduced) {
        const point = position?.(p.unitId);
        if (point && [point.x, point.y ?? 0, point.z].every(Number.isFinite))
          p.sprite.position.set(point.x, (point.y ?? 0) + p.heightOffset!, point.z);
      }
      if (p.toX !== undefined && !p.reduced) {
        p.sprite.position.x = THREE.MathUtils.lerp(p.fromX!, p.toX, progress);
        p.sprite.position.z = THREE.MathUtils.lerp(p.fromZ!, p.toZ!, progress);
        p.sprite.position.y = 1.15 + Math.sin(progress * Math.PI) * 0.25;
      }
    }
  }
  get activeCount(): number {
    return this.pool.used;
  }
  reset(): void {
    this.lastHit.clear();
    this.lastEvent.clear();
    this.pool.clear();
    this.particles = [];
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.reset();
    this.pool.dispose();
    new Set([
      ...this.frames,
      ...this.fallbackFrames,
      ...this.healingFrames,
      ...[...this.eventFrames.values()].flat(),
    ]).forEach((frame) => frame.dispose());
    this.eventFrames.clear();
    this.root.clear();
  }
}
