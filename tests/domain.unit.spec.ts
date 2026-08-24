import * as THREE from 'three';
import { expect, test } from '@playwright/test';
import { createBoneRecord } from '../src/domain/anatomy';
import { auditBoneRelations } from '../src/domain/relation-audit';
import type { BoneDefinition } from '../src/types/bone';

function boneMesh(name: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  mesh.name = name;
  return mesh;
}

test.describe('dominio anatómico', () => {
  test('traduce nombre, lateralidad y clasificación', () => {
    const bone = createBoneRecord(boneMesh('Femur_left'), 0);
    expect(bone.name).toBe('Fémur izquierdo');
    expect(bone.laterality).toBe('Izquierdo');
    expect(bone.region).toBe('Miembro inferior');
    expect(bone.type).toBe('Hueso largo');
  });

  test('clasifica huesos planos del cráneo', () => {
    const bone = createBoneRecord(boneMesh('Frontal'), 1);
    expect(bone.region).toBe('Cráneo');
    expect(bone.type).toBe('Hueso plano');
  });

  test('audita relaciones resueltas y no resueltas', () => {
    const bones: BoneDefinition[] = [
      {
        id: 'a',
        name: 'Radio',
        latin: 'Radius',
        region: 'Miembro superior',
        type: 'Hueso largo',
        location: 'Antebrazo',
        fact: 'Test',
        joins: [],
        articulations: [{ label: 'Cúbito', detail: 'Test', target: 'Cúbito' }],
      },
      {
        id: 'b',
        name: 'Cúbito',
        latin: 'Ulna',
        region: 'Miembro superior',
        type: 'Hueso largo',
        location: 'Antebrazo',
        fact: 'Test',
        joins: [],
      },
    ];
    const audit = auditBoneRelations(bones);
    expect(audit.totalRelations).toBe(1);
    expect(audit.unresolved).toHaveLength(0);
    expect(audit.withoutRelations).toEqual(['Cúbito']);
  });
});
