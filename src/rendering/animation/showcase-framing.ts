import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { ModelInstance } from '../assets/model-library';
import { visibleModelBounds } from '../assets/model-parts';

export type ShowcaseAction = 'idle' | 'walk' | 'attack' | 'cast';
export interface ShowcaseFraming {
  rest: THREE.Box3;
  actions: Partial<Record<ShowcaseAction, THREE.Box3>>;
  rejected: ShowcaseAction[];
}
const copy = (profile: ShowcaseFraming): ShowcaseFraming => ({
  rest: profile.rest.clone(),
  actions: Object.fromEntries(Object.entries(profile.actions).map(([state, box]) => [state, box.clone()])),
  rejected: [...profile.rejected],
});
const cache = new Map<string, ShowcaseFraming>();
let pending = Promise.resolve();
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const finite = (box: THREE.Box3) =>
  !box.isEmpty() && [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite);

/** At most 33 poses/clip; include key times as well as a uniform temporal grid. */
export function showcaseSampleTimes(clip: THREE.AnimationClip) {
  if (!Number.isFinite(clip.duration) || clip.duration <= 0) return [0];
  const times = new Set(Array.from({ length: 17 }, (_, i) => (clip.duration * i) / 16));
  const keys = [...new Set(clip.tracks.flatMap((track) => Array.from(track.times)))]
    .filter((time) => Number.isFinite(time) && time >= 0 && time <= clip.duration)
    .sort((a, b) => a - b);
  for (let i = 0; i < Math.min(16, keys.length); i++)
    times.add(keys[Math.round((i * (keys.length - 1)) / Math.max(1, Math.min(16, keys.length) - 1))]);
  return [...times].sort((a, b) => a - b);
}

/** Samples a detached skeleton, never advances the live preview or mutates shared clips/materials. */
export async function showcaseEnvelope(instance: ModelInstance, signal: AbortSignal, yieldTask = pause) {
  const clips = [
    ...new Set(
      ['idle', 'walk', 'attack', 'cast']
        .map(
          (state) =>
            instance.animationClips.find(
              (clip) => clip.name === instance.binding.clips[state as keyof typeof instance.binding.clips],
            ) ??
            instance.animationClips.find((clip) => clip.name === instance.binding.clips.idle) ??
            instance.animationClips[0],
        )
        .filter((clip): clip is THREE.AnimationClip => !!clip),
    ),
  ];
  const geometry: string[] = [];
  instance.root.traverse((object) => {
    if (object instanceof THREE.Mesh) geometry.push(object.geometry.uuid);
  });
  const key = JSON.stringify([
    geometry,
    clips.map((clip) => clip.uuid),
    instance.binding,
    instance.root.rotation.toArray(),
  ]);
  const job = async () => {
    if (signal.aborted) return undefined;
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return copy(cached);
    }
    await yieldTask();
    if (signal.aborted) return undefined;
    const root = clone(instance.root),
      mixer = new THREE.AnimationMixer(root),
      rest = visibleModelBounds(root),
      profile: ShowcaseFraming = { rest, actions: {}, rejected: [] };
    try {
      const measure = () => visibleModelBounds(root);
      const limit = Math.max(0.1, rest.getSize(new THREE.Vector3()).length()) * 4;
      let slice = performance.now();
      for (const clip of clips) {
        const bounds = new THREE.Box3().copy(rest);
        mixer.stopAllAction();
        const action = mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play();
        action.clampWhenFinished = true;
        for (const time of showcaseSampleTimes(clip)) {
          if (signal.aborted) return undefined;
          mixer.setTime(time);
          bounds.union(measure());
          if (performance.now() - slice >= 4) {
            await yieldTask();
            slice = performance.now();
          }
        }
        const safe = finite(bounds) && bounds.getSize(new THREE.Vector3()).length() <= limit;
        for (const state of ['idle', 'walk', 'attack', 'cast'] as const) {
          const mapped =
            instance.animationClips.find((candidate) => candidate.name === instance.binding.clips[state]) ??
            instance.animationClips.find((candidate) => candidate.name === instance.binding.clips.idle) ??
            instance.animationClips[0];
          if (mapped !== clip) continue;
          if (safe)
            profile.actions[state] = bounds
              .clone()
              .expandByVector(bounds.getSize(new THREE.Vector3()).multiplyScalar(0.08));
          else profile.rejected.push(state);
        }
      }
      if (signal.aborted || !finite(rest)) return undefined;
      cache.set(key, copy(profile));
      if (cache.size > 32) cache.delete(cache.keys().next().value!);
      return profile;
    } finally {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      root.clear(); // Geometry/materials/textures are shared with ModelLibrary.
    }
  };
  const result = pending.then(job);
  pending = result.then(
    () => {},
    () => {},
  );
  return result;
}

/** Includes all intermediate showcase sway angles, then the fixed normalization transform. */
export function showcaseWorldBounds(
  bounds: THREE.Box3,
  scale: number,
  position: THREE.Vector3,
  spin = false,
) {
  const result = bounds.clone();
  const radius = Math.hypot(
    Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
    Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)),
  );
  if (spin) {
    result.min.x = result.min.z = -radius;
    result.max.x = result.max.z = radius;
  } else {
    const padding = 2 * radius * Math.sin(0.14 / 2);
    result.min.x -= padding;
    result.min.z -= padding;
    result.max.x += padding;
    result.max.z += padding;
  }
  result.min.multiplyScalar(scale).add(position);
  result.max.multiplyScalar(scale).add(position);
  return result.union(
    new THREE.Box3(new THREE.Vector3(-1.08, -0.23, -1.08), new THREE.Vector3(1.08, 0, 1.08)),
  );
}

/** Fits actual view-space bounds, including camera pitch and off-centre animated weapons. */
export function frameShowcase(camera: THREE.OrthographicCamera, bounds: THREE.Box3, aspect: number) {
  if (!finite(bounds) || !Number.isFinite(aspect) || aspect <= 0) return false;
  camera.position.set(0, 2.85, 8);
  camera.lookAt(0, 1.3, 0);
  camera.updateMatrixWorld(true);
  const projected = new THREE.Box3(),
    point = new THREE.Vector3();
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z])
        projected.expandByPoint(point.set(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  const center = projected.getCenter(new THREE.Vector3()),
    size = projected.getSize(new THREE.Vector3());
  const retreat = Math.max(0, projected.max.z + 1);
  if (retreat) {
    camera.position.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion), retreat);
    camera.updateMatrixWorld(true);
    projected.min.z -= retreat;
    projected.max.z -= retreat;
  }
  const height = Math.max(3.05, size.y * 1.06, (size.x * 1.06) / aspect);
  camera.left = center.x - (height * aspect) / 2;
  camera.right = center.x + (height * aspect) / 2;
  camera.top = center.y + height / 2;
  camera.bottom = center.y - height / 2;
  camera.near = Math.max(0.01, -projected.max.z - 1);
  camera.far = Math.max(camera.near + 1, -projected.min.z + 1);
  camera.updateProjectionMatrix();
  return true;
}
