import * as THREE from 'three';

/** A readable recovery fallback. Explicit admin event atlases always take precedence. */
export function healingAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const cross = (x: number, y: number, size: number, alpha: number) => {
    const arm = size * 0.3;
    ctx.fillStyle = `rgba(12,38,31,${alpha * 0.85})`;
    ctx.fillRect(x - arm / 2 - 2, y - size / 2 - 2, arm + 4, size + 4);
    ctx.fillRect(x - size / 2 - 2, y - arm / 2 - 2, size + 4, arm + 4);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x - arm / 2, y - size / 2, arm, size);
    ctx.fillRect(x - size / 2, y - arm / 2, size, arm);
  };
  for (let frame = 0; frame < 8; frame++) {
    const p = frame / 7,
      x = frame * 128 + 64;
    const glow = ctx.createRadialGradient(x, 68, 0, x, 68, 40);
    glow.addColorStop(0, 'rgba(255,255,255,.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(frame * 128, 0, 128, 128);
    cross(x, 70 - p * 14, 72, 0.95);
    cross(x - 29, 86 - p * 42, 17, 0.75);
    cross(x + 29, 64 - p * 32, 14, 0.6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const frames = Array.from({ length: 8 }, (_, i) => {
    const frame = texture.clone();
    frame.repeat.set(1 / 8, 1);
    frame.offset.set(i / 8, 0);
    frame.needsUpdate = true;
    return frame;
  });
  texture.dispose();
  return frames;
}
