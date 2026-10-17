import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ModelInstance } from '../src/rendering/assets/model-library';
import { visibleModelBounds } from '../src/rendering/assets/model-parts';
import {
  showcaseEnvelope,
  showcaseSampleTimes,
  showcaseWorldBounds,
  frameShowcase,
} from '../src/rendering/animation/showcase-framing';

function fixture() {
  const source = new THREE.Group(),
    body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial()),
    sword = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), new THREE.MeshBasicMaterial());
  body.name = 'Body';
  sword.name = 'Sword';
  sword.position.set(0.6, 1, 0);
  source.add(body, sword);
  const clips = ['Idle', 'Walk', 'Attack', 'Cast'].map(
    (name, index) =>
      new THREE.AnimationClip(name, 1, [
        new THREE.NumberKeyframeTrack('Sword.rotation[z]', [0, 0.5, 1], [0, -index * 0.5, 0]),
        new THREE.NumberKeyframeTrack('Body.position[z]', [0, 0.5, 1], [0, index * 0.2, 0]),
      ]),
  );
  const instance = new ModelInstance(source, clips, {
    assetId: 'fixture',
    height: 2.4,
    yaw: 0,
    clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', cast: 'Cast' },
  });
  return {
    instance,
    clips,
    source,
    dispose() {
      instance.dispose();
      for (const mesh of [body, sword]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    },
  };
}

test('sampling bounds cover moving weapons without changing the live skeleton, mixer, geometry or clips', async () => {
  const f = fixture();
  try {
    f.instance.play('walk');
    f.instance.tick(0.17);
    const before = visibleModelBounds(f.instance.root),
      time = f.instance.mixer.time,
      pose = f.instance.model.getObjectByName('Sword')!.quaternion.clone(),
      tracks = f.clips.map((clip) => Array.from(clip.tracks[0].values));
    const bounds = await showcaseEnvelope(f.instance, new AbortController().signal);
    assert.ok(bounds);
    assert.ok(bounds.actions.cast!.max.x > before.max.x + 0.5, 'includes the cast sword sweep');
    assert.equal(f.instance.mixer.time, time);
    assert.deepEqual(f.instance.model.getObjectByName('Sword')!.quaternion.toArray(), pose.toArray());
    assert.deepEqual(
      f.clips.map((clip) => Array.from(clip.tracks[0].values)),
      tracks,
    );
    assert.deepEqual(visibleModelBounds(f.instance.root), before);
    bounds.actions.cast!.min.x = -999;
    const cached = await showcaseEnvelope(f.instance, new AbortController().signal);
    assert.notEqual(cached!.actions.cast!.min.x, -999, 'cache owns a separate value');
    for (const clip of f.clips) {
      f.instance.mixer.stopAllAction();
      const action = f.instance.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play();
      action.clampWhenFinished = true;
      for (let i = 0; i <= 40; i++) {
        f.instance.mixer.setTime(i / 40);
        assert.ok(
          cached!.actions[clip.name.toLowerCase() as 'idle' | 'walk' | 'attack' | 'cast']!.containsBox(
            visibleModelBounds(f.instance.root),
          ),
        );
      }
    }
  } finally {
    f.dispose();
  }
});

test('abnormal imported action geometry is rejected individually, retaining readable idle and walk framing', async () => {
  const f = fixture();
  try {
    f.clips[3].tracks.push(
      new THREE.VectorKeyframeTrack('Sword.position', [0, 0.5, 1], [0.6, 1, 0, 0.6, 10000, 0, 0.6, 1, 0]),
    );
    const framing = await showcaseEnvelope(f.instance, new AbortController().signal);
    assert.deepEqual(framing!.rejected, ['cast']);
    assert.equal(framing!.actions.cast, undefined);
    assert.ok(framing!.actions.walk && framing!.actions.attack);
    assert.ok(framing!.actions.walk!.getSize(new THREE.Vector3()).length() < 10);
    assert.equal(f.instance.model.getObjectByName('Sword')!.position.y, 1);
  } finally {
    f.dispose();
  }
});

test('preparation cancels before work or after yielding and never blocks later jobs', async () => {
  const f = fixture(),
    already = new AbortController(),
    mid = new AbortController();
  try {
    already.abort();
    assert.equal(await showcaseEnvelope(f.instance, already.signal), undefined);
    // A long clip exercises the bounded temporal/keyframe sample grid.
    f.clips[0].duration = 10;
    const times = showcaseSampleTimes(f.clips[0]);
    assert.ok(times.length <= 33);
    assert.equal(times.at(-1), 10);
    let yielded = false;
    const request = showcaseEnvelope(f.instance, mid.signal, async () => {
      yielded = true;
      mid.abort();
    });
    assert.equal(await request, undefined);
    assert.equal(yielded, true);
    assert.ok(await showcaseEnvelope(f.instance, new AbortController().signal));
    assert.deepEqual(showcaseSampleTimes(new THREE.AnimationClip('invalid', Infinity, [])), [0]);
  } finally {
    f.dispose();
  }
});

test('sway/spin and pitched orthographic framing keep tall, wide, deep and asymmetric figures inside every viewport', () => {
  const source = new THREE.Box3(new THREE.Vector3(-0.4, -0.5, -2), new THREE.Vector3(4, 5, 1)),
    position = new THREE.Vector3(-1, 0.3, 0.2),
    scale = 0.8;
  for (const spin of [false, true]) {
    const world = showcaseWorldBounds(source, scale, position, spin);
    for (let n = 0; n <= 40; n++) {
      const angle = spin ? (n * Math.PI) / 20 : -0.14 + (n * 0.28) / 40,
        matrix = new THREE.Matrix4().compose(
          position,
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
          new THREE.Vector3(scale, scale, scale),
        );
      assert.ok(world.containsBox(source.clone().applyMatrix4(matrix)));
    }
    for (const aspect of [0.35, 0.7, 1.5, 3]) {
      const camera = new THREE.OrthographicCamera();
      assert.equal(frameShowcase(camera, world, aspect), true);
      for (const x of [world.min.x, world.max.x])
        for (const y of [world.min.y, world.max.y])
          for (const z of [world.min.z, world.max.z]) {
            const ndc = new THREE.Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && Math.abs(ndc.z) < 1);
          }
    }
  }
  const camera = new THREE.OrthographicCamera();
  assert.equal(frameShowcase(camera, source, NaN), false);
  assert.equal(frameShowcase(camera, new THREE.Box3(), 1), false);
  const deep = new THREE.Box3(new THREE.Vector3(-3, -5, -100), new THREE.Vector3(4, 6, 100));
  assert.equal(frameShowcase(camera, deep, 0.45), true);
  for (const z of [-100, 100]) assert.ok(Math.abs(new THREE.Vector3(0, 0, z).project(camera).z) < 1);
});
