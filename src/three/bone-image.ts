import * as THREE from 'three';
import type { Bone } from '../types/bone';

const imageCanvas = document.createElement('canvas');
const imageRenderer = new THREE.WebGLRenderer({
  canvas: imageCanvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
imageRenderer.setPixelRatio(1);
imageRenderer.outputColorSpace = THREE.SRGBColorSpace;
imageRenderer.setClearColor(0x000000, 0);

export function isolatedBoneImage(bone: Pick<Bone, 'meshes'>, width = 520, height = 310) {
  imageCanvas.width = width;
  imageCanvas.height = height;
  imageRenderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.001, 20);
  const group = new THREE.Group();

  bone.meshes?.forEach((source) => {
    source.updateWorldMatrix(true, false);
    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrixWorld);
    group.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0xd8c5a7, roughness: 0.68, side: THREE.DoubleSide })
      )
    );
  });

  const box = new THREE.Box3().setFromObject(group);
  group.position.sub(box.getCenter(new THREE.Vector3()));
  scene.add(group, new THREE.HemisphereLight(0xffffff, 0x7b6f60, 2.8));
  const light = new THREE.DirectionalLight(0xffefd5, 3.5);
  light.position.set(-2, 3, 4);
  scene.add(light);
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 0.03);
  camera.position.set(radius * 0.42, radius * 0.15, radius * 2.15);
  camera.lookAt(0, 0, 0);
  imageRenderer.render(scene, camera);
  const url = imageCanvas.toDataURL('image/png');
  group.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    (object as THREE.Mesh).geometry.dispose();
    ((object as THREE.Mesh).material as THREE.Material).dispose();
  });
  return url;
}
