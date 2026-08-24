import type { BoneRegion } from '../types/bone';

export type AtlasMotionMode = 'dance' | 'jog' | 'gravity' | null;

export function assertNever(value: never): never {
  throw new Error(`Estado no contemplado: ${String(value)}`);
}

export function motionModeLabel(mode: Exclude<AtlasMotionMode, null>) {
  switch (mode) {
    case 'dance':
      return 'baile';
    case 'jog':
      return 'trote';
    case 'gravity':
      return 'gravedad';
    default:
      return assertNever(mode);
  }
}

export type AtlasState = {
  selectedBoneId?: string;
  viewedBoneIds: ReadonlySet<string>;
  filter: string;
  collapsedRegions: ReadonlySet<BoneRegion>;
  motion: AtlasMotionMode;
};

type Listener = (state: AtlasState) => void;

export function createAtlasState(): AtlasStateStore {
  let state: AtlasState = {
    viewedBoneIds: new Set(),
    filter: '',
    collapsedRegions: new Set(),
    motion: null,
  };
  const listeners = new Set<Listener>();
  const update = (next: AtlasState) => {
    state = next;
    listeners.forEach((listener) => listener(state));
  };
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clearSelection: () => {
      const { selectedBoneId: _selectedBoneId, ...withoutSelection } = state;
      update(withoutSelection);
    },
    markViewed: (boneId) => {
      const viewedBoneIds = new Set(state.viewedBoneIds);
      viewedBoneIds.add(boneId);
      update({ ...state, viewedBoneIds });
    },
    selectBone: (boneId) => update({ ...state, selectedBoneId: boneId }),
    setCollapsedRegions: (regions) => update({ ...state, collapsedRegions: new Set(regions) }),
    setFilter: (filter) => update({ ...state, filter }),
    setMotion: (motion) => update({ ...state, motion }),
    toggleRegion: (region) => {
      const collapsedRegions = new Set(state.collapsedRegions);
      if (collapsedRegions.has(region)) collapsedRegions.delete(region);
      else collapsedRegions.add(region);
      update({ ...state, collapsedRegions });
    },
  };
}

export type AtlasStateStore = {
  getState: () => AtlasState;
  subscribe: (listener: Listener) => () => void;
  clearSelection: () => void;
  markViewed: (boneId: string) => void;
  selectBone: (boneId: string) => void;
  setCollapsedRegions: (regions: Iterable<BoneRegion>) => void;
  setFilter: (filter: string) => void;
  setMotion: (motion: AtlasMotionMode) => void;
  toggleRegion: (region: BoneRegion) => void;
};
