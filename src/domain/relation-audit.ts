import type { Bone } from '../types/bone';

export type AuditedRelation = {
  sourceId: string;
  sourceName: string;
  target: string;
  resolvedId?: string | undefined;
  resolvedName?: string | undefined;
};

export type RelationAudit = {
  totalBones: number;
  totalRelations: number;
  relations: AuditedRelation[];
  unresolved: AuditedRelation[];
  duplicateNames: string[];
  nonReciprocal: AuditedRelation[];
  withoutRelations: string[];
};

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}

export type BoneIndex = {
  byId: ReadonlyMap<string, Bone>;
  byName: ReadonlyMap<string, Bone>;
};

export function createBoneIndex(bones: Bone[]): BoneIndex {
  const byId = new Map<string, Bone>();
  const byName = new Map<string, Bone>();
  bones.forEach((bone) => {
    byId.set(bone.id, bone);
    byName.set(normalizeName(bone.name), bone);
  });
  return { byId, byName };
}

export function findBoneByName(bones: Bone[], target: string) {
  return createBoneIndex(bones).byName.get(normalizeName(target));
}

export function auditBoneRelations(bones: Bone[]): RelationAudit {
  const names = new Map<string, Bone[]>();
  bones.forEach((bone) => {
    const key = normalizeName(bone.name);
    names.set(key, [...(names.get(key) || []), bone]);
  });

  const duplicateNames = [...names.values()]
    .filter((matches) => matches.length > 1)
    .map((matches) => matches[0]!.name);
  const relations = bones.flatMap((source) =>
    (source.articulations || []).map((relation) => {
      const resolved = findBoneByName(bones, relation.target);
      return {
        sourceId: source.id,
        sourceName: source.name,
        target: relation.target,
        resolvedId: resolved?.id,
        resolvedName: resolved?.name,
      };
    })
  );
  const unresolved = relations.filter((relation) => !relation.resolvedId);
  const nonReciprocal = relations.filter((relation) => {
    if (!relation.resolvedId) return false;
    const target = bones.find((bone) => bone.id === relation.resolvedId);
    return !(target?.articulations || []).some(
      (reverse) => normalizeName(reverse.target) === normalizeName(relation.sourceName)
    );
  });

  return {
    totalBones: bones.length,
    totalRelations: relations.length,
    relations,
    unresolved,
    duplicateNames,
    nonReciprocal,
    withoutRelations: bones.filter((bone) => !bone.articulations?.length).map((bone) => bone.name),
  };
}
