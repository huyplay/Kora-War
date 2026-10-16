import * as THREE from 'three';

/** Neutral, baked stone shading; preserves the published material tint and geometry. */
export function shadeArenaSurface(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position'),
    normals = geometry.getAttribute('normal');
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const center = bounds.getCenter(new THREE.Vector3());
  const signature = Math.sin(center.x * 7.13 + center.y * 11.47 + center.z * 13.7) * 43758.5453;
  const variation = 0.94 + (signature - Math.floor(signature)) * 0.06;
  const height = Math.max(1e-6, bounds.max.y - bounds.min.y);
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const elevation = (positions.getY(i) - bounds.min.y) / height;
    const seam = 0.82 + 0.18 * THREE.MathUtils.smoothstep(elevation, 0, 0.3);
    const face = 0.92 + 0.08 * Math.max(0, normals.getY(i));
    const shade = variation * seam * face;
    colors.fill(shade, i * 3, i * 3 + 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
