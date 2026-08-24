import type { Bone, BoneRegion } from '../types/bone';
import { icon } from './icons';

const REGION_ORDER: BoneRegion[] = [
  'Cráneo',
  'Tórax',
  'Columna vertebral',
  'Miembro superior',
  'Pelvis',
  'Miembro inferior',
];

export function renderBoneList(
  container: HTMLElement,
  bones: Bone[],
  collapsedRegions: Set<BoneRegion>,
  thumbnailCache: Map<string, string>,
  filter: string
) {
  const groups = [...new Set(bones.map((bone) => bone.region))].sort((a, b) => {
    const aIndex = REGION_ORDER.indexOf(a);
    const bIndex = REGION_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, 'es');
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  container.innerHTML = groups
    .map((region) => {
      const items = bones.filter(
        (bone) =>
          bone.region === region &&
          `${bone.name} ${bone.latin}`.toLowerCase().includes(filter.toLowerCase())
      );
      if (!items.length) return '';
      const collapsed = collapsedRegions.has(region) && !filter;
      return `<button class="region-title ${collapsed ? 'collapsed' : ''}" data-region="${region}" aria-expanded="${!collapsed}"><span>${icon('chevron')}${region}</span><span>${items.length}</span></button><div class="region-items" ${collapsed ? 'hidden' : ''}>${items.map((bone) => `<button class="bone-item" data-id="${bone.id}"><span class="bone-icon"><img class="bone-thumb" src="${thumbnailCache.get(bone.id) || ''}" alt="Miniatura de ${bone.name}"></span><span class="bone-copy"><strong>${bone.name}</strong><span>${bone.latin}</span></span></button>`).join('')}</div>`;
    })
    .join('');
}

export function updateExplorationProgress(bones: Bone[], viewed: Set<string>) {
  const total = bones.length || 204;
  const seen = Math.min(viewed.size, total);
  const percentage = Math.round((seen / total) * 100);
  document.querySelector('.viewed-count')!.textContent = String(seen);
  document.querySelector('.total-count')!.textContent = String(total);
  document.querySelector('.progress-percent')!.textContent = `${percentage}%`;
  (document.querySelector('.progress-track i') as HTMLElement).style.width = `${percentage}%`;
}
