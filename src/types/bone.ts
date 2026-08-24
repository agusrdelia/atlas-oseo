import type * as THREE from 'three';

// Shared domain contracts for skeletal anatomy.

export type BoneLink = {
  label: string;
  detail: string;
  target: string;
};

export type BoneRegion =
  'Cráneo' | 'Tórax' | 'Columna vertebral' | 'Miembro superior' | 'Pelvis' | 'Miembro inferior';

export type BoneType =
  | 'Hueso irregular'
  | 'Hueso largo'
  | 'Hueso plano'
  | 'Hueso sesamoideo'
  | 'Hueso corto'
  | 'Huesos cortos y largos'
  | 'Huesos irregulares'
  | 'Huesos planos';

export type BoneLaterality = 'Derecho' | 'Izquierdo' | 'Impar';

export type BoneDefinition = {
  id: string;
  name: string;
  latin: string;
  region: BoneRegion;
  type: BoneType;
  location: string;
  laterality?: BoneLaterality;
  formation?: string;
  fact: string;
  curiosity?: string;
  articulations?: BoneLink[];
  /** Legacy relation labels kept only by the bootstrap fallback; use articulations for UI relations. */
  joins: string[];
};

export type RenderedBone = BoneDefinition & {
  meshes: THREE.Mesh[];
  focus: number;
};

/** Compatibility shape for bootstrap data that has not been rendered yet. */
export type Bone = BoneDefinition & {
  meshes?: THREE.Mesh[];
  focus: number;
};
