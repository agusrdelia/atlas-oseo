type SheetState = 'peek' | 'half' | 'full';

type MobileDetailSheetOptions = {
  onClose: () => void;
  onSnap?: (state: SheetState, height: number) => void;
};

const MOBILE_QUERY = '(max-width: 820px)';

function viewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function snapHeights() {
  const height = viewportHeight();
  return {
    peek: Math.min(Math.max(height * 0.15, 110), 145),
    half: height * 0.6,
    full: height - 12,
  } satisfies Record<SheetState, number>;
}

export function createMobileDetailSheet(
  element: HTMLElement,
  { onClose, onSnap }: MobileDetailSheetOptions
) {
  const media = window.matchMedia(MOBILE_QUERY);
  let state: SheetState = 'peek';
  let pointerId: number | undefined;
  let startY = 0;
  let startHeight = 0;
  let currentHeight = 0;
  let moved = false;
  let dragHandle: HTMLElement | undefined;

  function applyHeight(height: number, animate = true) {
    currentHeight = height;
    element.classList.toggle('sheet-dragging', !animate);
    element.style.setProperty('--sheet-height', `${height}px`);
  }

  function snap(next: SheetState, notify = true) {
    state = next;
    element.dataset.sheetState = next;
    const height = snapHeights()[next];
    applyHeight(height);
    if (notify) onSnap?.(next, height);
    return height;
  }

  function open() {
    if (!media.matches) return 0;
    return snap('peek', false);
  }

  function close() {
    pointerId = undefined;
    element.classList.remove('sheet-dragging');
    element.style.removeProperty('--sheet-height');
    delete element.dataset.sheetState;
  }

  function finishDrag(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    if (dragHandle?.hasPointerCapture(event.pointerId))
      dragHandle.releasePointerCapture(event.pointerId);
    dragHandle = undefined;
    pointerId = undefined;
    element.classList.remove('sheet-dragging');

    const heights = snapHeights();
    if (currentHeight < heights.peek * 0.78) {
      onClose();
      return;
    }

    const nearest = (Object.entries(heights) as [SheetState, number][]).reduce((best, item) =>
      Math.abs(item[1] - currentHeight) < Math.abs(best[1] - currentHeight) ? item : best
    );
    snap(nearest[0]);
  }

  function isDragSurface(target: EventTarget | null) {
    const node = target as HTMLElement | null;
    return !!node?.closest('.detail-sheet-header') && !node.closest('.close');
  }

  element.addEventListener('pointerdown', (event) => {
    if (!media.matches || !isDragSurface(event.target)) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    startHeight = element.getBoundingClientRect().height;
    currentHeight = startHeight;
    moved = false;
    dragHandle = (event.target as HTMLElement).closest<HTMLElement>('.detail-sheet-header')!;
    dragHandle.setPointerCapture(event.pointerId);
  });

  window.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    const delta = startY - event.clientY;
    moved ||= Math.abs(delta) > 5;
    const heights = snapHeights();
    applyHeight(Math.min(heights.full, Math.max(heights.peek * 0.55, startHeight + delta)), false);
  });

  window.addEventListener('pointerup', finishDrag);
  window.addEventListener('pointercancel', finishDrag);
  element.addEventListener('click', (event) => {
    if (!media.matches || !isDragSurface(event.target)) return;
    if (moved) {
      moved = false;
      return;
    }
    snap(state === 'peek' ? 'half' : state === 'half' ? 'full' : 'peek');
  });

  function resize() {
    if (media.matches && element.classList.contains('open')) snap(state);
    else if (!media.matches) close();
  }
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);

  return { open, close, snap };
}
