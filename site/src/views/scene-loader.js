import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Load the assembled workshop scene into a stage, scaled so its widest side is `span` units,
// sitting on y=0. Blender's procedural wood/glow node trees do not survive glTF export, so
// those two materials are restored by name.
export function loadScene(stage, url, { span = 1.8, onLoad } = {}) {
  const { THREE } = stage;
  new GLTFLoader().load(url, (g) => {
    const root = g.scene;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = span / Math.max(size.x, size.z);
    root.scale.setScalar(scale);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    const offset = new THREE.Vector3(-c.x, -box.min.y * scale, -c.z);
    root.position.copy(offset);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const name = o.material?.name || '';
      if (name.startsWith('wood')) o.material.color.set(0x7a3f1c);
      if (name.startsWith('glow')) {
        o.material.emissive.set(0xff6a00);
        o.material.emissiveIntensity = 2.2;
      }
    });
    stage.scene.add(root);
    onLoad?.({ root, scale, offset, size: size.multiplyScalar(scale) });
  });
}
