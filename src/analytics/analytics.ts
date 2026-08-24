export type BoneSelectionSource = 'model' | 'list' | 'search' | 'relation';
export type MotionMode = 'dance' | 'jog' | 'gravity';
export type ControlType = 'zoom' | 'pan' | 'rotate' | 'double_zoom';

type AnalyticsEventMap = {
  bone_view: {
    bone_id: string;
    bone_name: string;
    region: string;
    source: BoneSelectionSource;
    is_first_view: boolean;
    bones_viewed_count: number;
  };
  exploration_milestone: { percent: number; bones_viewed: number };
  relation_follow: { from_bone: string; to_bone: string };
  motion_mode: { mode: MotionMode; action: 'start' | 'stop'; duration_ms?: number };
  control_used: { control: ControlType; device_type: 'mobile' | 'desktop' };
  search_used: { query_length: number; results_count: number; has_results: boolean };
  info_open: Record<string, never>;
  donation_click: { placement: 'info_modal' };
  app_ready: { load_time_ms: number };
};

type AnalyticsEventName = keyof AnalyticsEventMap;
type Gtag = (
  command: 'event' | 'js' | 'config',
  eventName: AnalyticsEventName | string | Date,
  parameters?: AnalyticsEventMap[AnalyticsEventName]
) => void;

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initAnalytics() {
  if (!measurementId || document.querySelector('script[data-ga4]')) return Boolean(measurementId);
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer!.push(args);
  const script = document.createElement('script');
  script.async = true;
  script.dataset.ga4 = 'true';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  return true;
}

const viewedBones = new Set<string>();
const sentMilestones = new Set<number>();
const usedControls = new Set<ControlType>();
const milestones = [10, 25, 50, 75, 100];
let activeMotion: { mode: MotionMode; startedAt: number } | undefined;

function gtag() {
  return (window as Window & { gtag?: Gtag }).gtag;
}

export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  parameters: AnalyticsEventMap[Name]
) {
  try {
    gtag()?.('event', name, parameters);
  } catch {
    // Analytics must never interfere with the atlas experience.
  }
}

export function trackBoneView(input: {
  boneId: string;
  boneName: string;
  region: string;
  source: BoneSelectionSource;
  bonesViewedCount: number;
}) {
  const isFirstView = !viewedBones.has(input.boneId);
  viewedBones.add(input.boneId);
  trackEvent('bone_view', {
    bone_id: input.boneId,
    bone_name: input.boneName,
    region: input.region,
    source: input.source,
    is_first_view: isFirstView,
    bones_viewed_count: input.bonesViewedCount,
  });
}

export function trackExplorationMilestones(bonesViewed: number, totalBones: number) {
  if (!totalBones) return;
  const progress = (bonesViewed / totalBones) * 100;
  milestones.forEach((percent) => {
    if (progress < percent || sentMilestones.has(percent)) return;
    sentMilestones.add(percent);
    trackEvent('exploration_milestone', { percent, bones_viewed: bonesViewed });
  });
}

export function trackRelationFollow(fromBone: string, toBone: string) {
  trackEvent('relation_follow', { from_bone: fromBone, to_bone: toBone });
}

export function trackMotionTransition(nextMode: MotionMode | null) {
  if (activeMotion?.mode === nextMode) return;
  const now = performance.now();
  if (activeMotion) {
    trackEvent('motion_mode', {
      mode: activeMotion.mode,
      action: 'stop',
      duration_ms: Math.max(0, Math.round(now - activeMotion.startedAt)),
    });
    activeMotion = undefined;
  }
  if (nextMode) {
    activeMotion = { mode: nextMode, startedAt: now };
    trackEvent('motion_mode', { mode: nextMode, action: 'start' });
  }
}

export function trackControlUsed(control: ControlType) {
  if (usedControls.has(control)) return;
  usedControls.add(control);
  trackEvent('control_used', {
    control,
    device_type: matchMedia('(max-width: 820px)').matches ? 'mobile' : 'desktop',
  });
}

export function trackSearch(queryLength: number, resultsCount: number) {
  trackEvent('search_used', {
    query_length: queryLength,
    results_count: resultsCount,
    has_results: resultsCount > 0,
  });
}

export function trackAppReady() {
  trackEvent('app_ready', { load_time_ms: Math.max(0, Math.round(performance.now())) });
}
