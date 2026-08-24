import * as THREE from 'three';

export type AnatomicalSide = 'derecho' | 'izquierdo';

export type BoneMeshUserData = {
  anatomicalSide?: AnatomicalSide;
  baseColor?: THREE.Color;
  boneId?: string;
};

export function meshUserData(mesh: THREE.Mesh): BoneMeshUserData {
  return mesh.userData as BoneMeshUserData;
}
