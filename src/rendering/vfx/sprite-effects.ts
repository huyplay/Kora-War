import * as THREE from 'three';
import type { GameEvent } from '../../core/types';
import type { ContentConfig } from '../../data/content';
import { LANES } from '../../data/map';
import { ObjectPool } from '../../engine/object-pool';
interface Particle {
    sprite: THREE.Sprite;
    age: number;
    duration: number;
    size: number;
}
/** Original eight-frame sprite atlas, generated locally. No external texture request. */
export class SpriteEffects {
    readonly root = new THREE.Group();
    private frames: THREE.Texture[] = [];
    private particles: Particle[] = [];
    private pool: ObjectPool<Particle>;
    private profile?: ContentConfig['vfx'];
    private disposed = false;
    configure(profile: ContentConfig['vfx']) {
        this.profile = profile;
        if (profile.spriteAssetId)
            new THREE.TextureLoader().load(`/api/assets/${profile.spriteAssetId}`, texture => {
                if (this.disposed) {
                    texture.dispose();
                    return;
                }
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = false;
                texture.minFilter = THREE.LinearFilter;
                this.frames.forEach(frame => frame.dispose());
                this.frames = [];
                const columns = profile.spriteColumns || 8, rows = profile.spriteRows || 1;
                for (let i = 0; i < columns * rows; i++) {
                    const frame = texture.clone();
                    frame.repeat.set(1 / columns, 1 / rows);
                    frame.offset.set((i % columns) / columns, 1 - (Math.floor(i / columns) + 1) / rows);
                    frame.needsUpdate = true;
                    this.frames.push(frame);
                }
                texture.dispose();
            });
    }
    constructor() {
        this.root.name = 'SpriteEffects';
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        for (let frame = 0; frame < 8; frame++) {
            const p = frame / 7, x = frame * 128 + 64;
            const glow = ctx.createRadialGradient(x, 64, 0, x, 64, 60);
            glow.addColorStop(0, `rgba(255,255,255,${.85 * (1 - p)})`);
            glow.addColorStop(.45, 'rgba(255,255,255,.25)');
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(frame * 128, 0, 128, 128);
            ctx.strokeStyle = `rgba(255,255,255,${1 - p * .8})`;
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
        this.pool = new ObjectPool(48, () => {
            const material = new THREE.SpriteMaterial({ map: this.frames[0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
            const sprite = new THREE.Sprite(material);
            sprite.visible = false;
            this.root.add(sprite);
            return { sprite, age: 0, duration: .6, size: 2 };
        }, p => { p.sprite.visible = false; }, p => p.sprite.material.dispose());
    }
    emit(event: GameEvent): void {
        if (!['spawn', 'skill', 'heal', 'death', 'pulse'].includes(event.type))
            return;
        const particle = this.pool.acquire();
        if (!particle)
            return;
        particle.age = 0;
        particle.duration = event.type === 'pulse' ? 1 : .65;
        particle.size = (event.type === 'pulse' ? 6 : 2) * (this.profile?.intensity || 1);
        particle.sprite.position.set(event.x, 1, LANES[event.lane]);
        particle.sprite.visible = true;
        particle.sprite.material.color.set(event.type === 'heal' ? (this.profile?.heal || '#70ffc7') : event.side === 0 ? (this.profile?.ally || '#7ddcff') : (this.profile?.enemy || '#ffa075'));
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
            p.sprite.material.map = this.frames[Math.min(this.frames.length - 1, Math.floor(progress * this.frames.length))];
            p.sprite.material.opacity = 1 - progress;
            p.sprite.material.rotation = progress * .8;
            p.sprite.scale.setScalar(p.size * (.5 + progress));
        }
    }
    get activeCount(): number { return this.pool.used; }
    reset(): void { this.pool.clear(); this.particles = []; }
    dispose(): void { this.disposed = true; this.reset(); this.pool.dispose(); this.frames.forEach(frame => frame.dispose()); this.root.clear(); }
}
