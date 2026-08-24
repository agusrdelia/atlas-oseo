// UI icon primitives.
export type IconName =
  | 'search'
  | 'reset'
  | 'info'
  | 'menu'
  | 'close'
  | 'collapse'
  | 'chevron'
  | 'rotate'
  | 'zoom'
  | 'move'
  | 'touch-one'
  | 'touch-two'
  | 'pinch'
  | 'music'
  | 'skull'
  | 'shield'
  | 'support'
  | 'activity'
  | 'mineral'
  | 'blood';

const paths: Record<IconName, string> = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  collapse: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/>',
  move: '<path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/>',
  'touch-one':
    '<path d="M12 13V5a2 2 0 0 1 4 0v7l1.5-1a2 2 0 0 1 3 1.7V16c0 3.3-2.7 6-6 6h-1.2a6 6 0 0 1-4.7-2.3L6 16.5a2 2 0 0 1 3-2.6l3 2.1"/><path d="M7 4 4 7l3 3M4 7h5"/>',
  'touch-two':
    '<path d="M8 13V6a2 2 0 0 1 4 0v6M12 11V5a2 2 0 0 1 4 0v7l1.5-1a2 2 0 0 1 3 1.7V16c0 3.3-2.7 6-6 6h-2a6 6 0 0 1-4.8-2.4L5.5 17a2 2 0 0 1 2.5-3"/>',
  pinch:
    '<path d="m3 3 5 5M3 8V3h5M21 3l-5 5M21 8V3h-5"/><path d="M8 21v-7a2 2 0 0 1 4 0v2-5a2 2 0 0 1 4 0v5l1.5-1a2 2 0 0 1 3 1.7V18c0 2.2-1.8 4-4 4h-4.8a5 5 0 0 1-4-2L6 18a2 2 0 0 1 2-3"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  skull:
    '<path d="M16 20a2 2 0 0 0 2-2v-1a8 8 0 1 0-12 0v1a2 2 0 0 0 2 2Z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="m11.5 17 .5-1 .5 1M8 20v2h8v-2M12 20v2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  support: '<path d="M4 21h16M6 17h12M8 17V8m8 9V8M5 8h14L12 3 5 8Z"/>',
  activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  mineral: '<path d="m12 2 8 6-3 10H7L4 8l8-6Z"/><path d="m4 8 8 4 8-4M12 12v8"/>',
  blood: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
};

export const boneSvg =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10c-4-4-10-1-9 5 0 3 3 5 6 5l26 32c2 3 7 3 9 0 3-3 1-9-4-9L24 14c0-2-2-4-4-4Z" fill="currentColor"/><circle cx="46" cy="48" r="7" fill="currentColor"/></svg>';

export function icon(name: IconName) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
