import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { RenderedBone } from '../types/bone';
import { meshUserData } from './mesh-user-data';

type ModelResult = {
  model: THREE.Group;
  bones: RenderedBone[];
  meshes: THREE.Mesh[];
  visualMeshes: THREE.Mesh[];
};

export function loadSkeletonModel(
  createBone: (mesh: THREE.Mesh, index: number) => RenderedBone,
  onLoad: (result: ModelResult) => void | Promise<void>,
  onError: (error: unknown) => void
) {
  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load(
    '/models/overview-skeleton.glb',
    async (gltf) => {
      const model = gltf.scene;
      ['Bones_right', 'Cartilages_right'].forEach((groupName) => {
        const source = model.getObjectByName(groupName);
        if (!source) return;
        source.traverse(
          (object) => (meshUserData(object as THREE.Mesh).anatomicalSide = 'derecho')
        );
        const mirrored = source.clone(true);
        mirrored.name = groupName.replace('right', 'left');
        mirrored.scale.x = -1;
        mirrored.traverse(
          (object) => (meshUserData(object as THREE.Mesh).anatomicalSide = 'izquierdo')
        );
        model.add(mirrored);
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.updateMatrixWorld(true);

      const bones: RenderedBone[] = [];
      const meshes: THREE.Mesh[] = [];
      const visualMeshes: THREE.Mesh[] = [];
      model.traverse((object) => {
        if (!(object as THREE.Mesh).isMesh) return;
        const mesh = object as THREE.Mesh;
        const name = mesh.name.toLowerCase().replace(/_/g, ' ');
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.material = (mesh.material as THREE.Material).clone();
        meshUserData(mesh).baseColor = (mesh.material as THREE.MeshStandardMaterial).color.clone();
        visualMeshes.push(mesh);
        if (/costal cart|tooth|incisor|canine|premolar/.test(name)) return;
        const bone = createBone(mesh, bones.length);
        meshUserData(mesh).boneId = bone.id;
        meshes.push(mesh);
        bones.push(bone);
      });

      await onLoad({ model, bones, meshes, visualMeshes });
    },
    undefined,
    onError
  );
}
