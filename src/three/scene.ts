// Main Three.js scene setup.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createSkeletonScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  const homePosition = new THREE.Vector3(0, 0.9, 3.7);
  const homeTarget = new THREE.Vector3(0, 0.88, 0);
  const usesTouch = matchMedia('(pointer: coarse)').matches;
  camera.position.copy(homePosition);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, usesTouch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.copy(homeTarget);
  controls.minDistance = 0.18;
  controls.maxDistance = 8;
  controls.enablePan = true;
  controls.rotateSpeed = usesTouch ? 0.55 : 0.7;
  controls.panSpeed = usesTouch ? 0.45 : 0.55;
  controls.zoomSpeed = usesTouch ? 0.75 : 1.8;
  controls.zoomToCursor = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  scene.add(new THREE.HemisphereLight(0xfffdf5, 0x746f65, 2.3));
  const key = new THREE.DirectionalLight(0xfff4da, 4);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9d9df, 3);
  rim.position.set(4, 2, -4);
  scene.add(rim);

  return {
    scene,
    camera,
    renderer,
    controls,
    homePosition,
    homeTarget,
    destroy() {
      controls.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
    },
  };
}
