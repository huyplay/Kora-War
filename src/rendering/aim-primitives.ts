import * as THREE from 'three';

/** Shared static aim meshes; positions and sizes come from the locked match. */
export function createAimArea() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color() },
        size: { value: new THREE.Vector2(1, 1) },
        strength: { value: 1 },
      },
      vertexShader: `varying vec2 vUv;
        void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform vec3 color; uniform vec2 size; uniform float strength; varying vec2 vUv;
        void main(){
          vec2 edge=min(vUv,1.-vUv)*size;
          float border=1.-smoothstep(.065,.10,min(edge.x,edge.y));
          gl_FragColor=vec4(mix(color,vec3(1.),border*.2),mix(.08,.9,border)*strength);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.29;
  return mesh;
}

export function createAimMarkers() {
  const mesh = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.88, 1, 32),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    100,
  );
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}
