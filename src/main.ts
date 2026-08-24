import './style.css';
import * as THREE from 'three';
import { createSkeletonScene } from './three/scene';
import { isolatedBoneImage } from './three/bone-image';
import { loadSkeletonModel } from './three/model-loader';
import { boneSvg } from './ui/icons';
import { startLoadingPhrases } from './ui/loading';
import {
  appMarkup,
  audioCreditMarkup,
  boneDetailMarkup,
  generalInfoMarkup,
  gravityButtonMarkup,
  infoModalMarkup,
  jogButtonMarkup,
  mobileRotationCommandMarkup,
  modelCreditMarkup,
} from './ui/templates';
import { renderBoneList, updateExplorationProgress } from './ui/sidebar';
import { createMobileDetailSheet } from './ui/mobile-detail-sheet';
import { meshUserData } from './three/mesh-user-data';
import { createCameraController } from './three/camera-controller';
import { createAtlasState, motionModeLabel } from './app/atlas-state';
import { createAudioController } from './app/audio-controller';
import type { Bone, BoneRegion } from './types/bone';
import { fallbackBones } from './data/fallback-bones';
import { createBoneRecord } from './domain/anatomy';
import { auditBoneRelations, createBoneIndex } from './domain/relation-audit';
import {
  trackAppReady,
  trackBoneView,
  trackControlUsed,
  trackEvent,
  trackExplorationMilestones,
  initAnalytics,
  trackMotionTransition,
  trackRelationFollow,
  trackSearch,
  type BoneSelectionSource,
} from './analytics/analytics';

initAnalytics();

let bones: Bone[] = fallbackBones;
let boneIndex = createBoneIndex(bones);
let generalInfo = generalInfoMarkup();
document.querySelector('#app')!.innerHTML = appMarkup(generalInfo);
document.querySelector('#app')!.insertAdjacentHTML('beforeend', infoModalMarkup());
const desktopRotationRow = [...document.querySelectorAll<HTMLElement>('.command-row')].find(
  (row) => row.querySelector('strong')?.textContent === 'Cmd / Ctrl + arrastrar'
);
desktopRotationRow?.insertAdjacentHTML('afterend', mobileRotationCommandMarkup());
const creditSection = document
  .querySelector('.info-dialog-section a[href*="anatomytool.org"]')
  ?.closest('.info-dialog-section');
const modelCredit = creditSection?.querySelector('p');
if (modelCredit) modelCredit.innerHTML = modelCreditMarkup();
creditSection?.insertAdjacentHTML('beforeend', audioCreditMarkup());
const projectSection = [...document.querySelectorAll<HTMLElement>('.info-dialog-section')].find(
  (section) => section.querySelector('h3')?.textContent === 'Sobre este proyecto'
);
if (creditSection && projectSection) creditSection.before(projectSection);
const authorName = document.querySelector<HTMLElement>('.info-author strong');
if (authorName) {
  const authorEmail = document.createElement('a');
  authorEmail.className = 'author-email';
  authorEmail.href = 'mailto:agusrdelia@gmail.com';
  authorEmail.textContent = authorName.textContent;
  authorName.replaceWith(authorEmail);
}
const authorFooter = document.querySelector<HTMLElement>('.info-author');
if (authorFooter) {
  const donationLink = document.createElement('a');
  donationLink.className = 'donation-link';
  donationLink.href = 'https://cafecito.app/agusrdelia';
  donationLink.target = '_blank';
  donationLink.rel = 'noopener noreferrer';
  donationLink.textContent = '♥ Donaciones';
  donationLink.addEventListener('click', () =>
    trackEvent('donation_click', { placement: 'info_modal' })
  );
  authorFooter.append(donationLink);
}
document.querySelector('.dance-btn')!.insertAdjacentHTML('afterend', jogButtonMarkup());
document.querySelector('.jog-btn')!.insertAdjacentHTML('afterend', gravityButtonMarkup());

const list = document.querySelector<HTMLElement>('.bone-list')!;
const detail = document.querySelector<HTMLElement>('.detail')!;
const viewport = document.querySelector<HTMLElement>('.viewport')!;
const shell = document.querySelector<HTMLElement>('.shell')!;
const mobileNav = document.querySelector<HTMLButtonElement>('.mobile-nav')!;
const sidebarClose = document.querySelector<HTMLButtonElement>('.sidebar-close')!;
const sidebarBackdrop = document.querySelector<HTMLButtonElement>('.sidebar-backdrop')!;
const danceButton = document.querySelector<HTMLButtonElement>('.dance-btn')!;
const jogButton = document.querySelector<HTMLButtonElement>('.jog-btn')!;
const gravityButton = document.querySelector<HTMLButtonElement>('.gravity-btn')!;
const infoButton = document.querySelector<HTMLButtonElement>('.icon-btn')!;
const infoModal = document.querySelector<HTMLElement>('.info-modal')!;
const mobileDetailSheet = createMobileDetailSheet(detail, {
  onClose: () => select(undefined, { playCloseSound: true }),
  onSnap: (state, height) => {
    if (state === 'peek' && selected) cameraController.focus(selected.meshes ?? [], height);
  },
});
const audio = createAudioController();
const {
  dance: danceAudio,
  running: runningAudio,
  fallingBones: fallingBonesAudio,
  boneClick: boneClickAudio,
  detailClose: detailCloseAudio,
} = audio;
const audioReady = audio.ready;
const stopLoadingPhrases = startLoadingPhrases(
  document.querySelector<HTMLElement>('.loader strong')!
);
function revealApplication() {
  stopLoadingPhrases();
  document.querySelector('#boot-loader')?.classList.add('done');
  shell.classList.remove('app-loading');
  document.querySelector('.loader')?.classList.add('done');
  trackAppReady();
}
let collapsedRegions = new Set<BoneRegion>(),
  currentFilter = '',
  viewed = new Set<string>();
const atlasState = createAtlasState();
atlasState.subscribe((state) => {
  collapsedRegions = new Set(state.collapsedRegions);
  currentFilter = state.filter;
  viewed = new Set(state.viewedBoneIds);
});
const thumbnailCache = new Map<string, string>();
const detailImageCache = new Map<string, string>();
function renderList(filter = currentFilter) {
  atlasState.setFilter(filter);
  renderBoneList(list, bones, collapsedRegions, thumbnailCache, filter);
}
function updateProgress() {
  updateExplorationProgress(bones, viewed);
}
async function generateThumbnails(startIndex: number, endIndex = bones.length, batchSize = 8) {
  const safeEndIndex = Math.min(endIndex, bones.length);
  for (let i = startIndex; i < safeEndIndex; i += 1) {
    const bone = bones[i]!;
    thumbnailCache.set(bone.id, isolatedBoneImage(bone, 96, 96));
    if ((i - startIndex + 1) % batchSize === 0) {
      renderList();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
  renderList();
}
renderList();

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const { scene, camera, renderer, controls, homePosition, homeTarget } = createSkeletonScene(canvas);
const cameraController = createCameraController({
  camera,
  controls,
  canvas,
  homePosition,
  homeTarget,
});
if (import.meta.env.DEV) {
  window.__ATLAS_VIEW__ = () => ({
    cameraPosition: camera.position.toArray(),
    target: controls.target.toArray(),
  });
}
const meshes: THREE.Mesh[] = [];
const visualMeshes: THREE.Mesh[] = [];
const meshesByBoneId = new Map<string, THREE.Mesh[]>();
type DanceController = {
  mode: 'dance' | 'jog' | null;
  setMode: (mode: 'dance' | 'jog' | null) => void;
  update: (delta: number) => void;
};
type GravityController = {
  active: boolean;
  restoring: boolean;
  setActive: (active: boolean) => void;
  update: (delta: number) => void;
};
const GRAVITY_RESTORE_DURATION_MS = 850;
let motionModel: THREE.Group | undefined;
let danceController: DanceController | undefined;
let gravityController: GravityController | undefined;
let danceControllerPromise: Promise<void> | undefined;
let gravityControllerPromise: Promise<void> | undefined;
async function ensureDanceController() {
  if (danceController) return;
  if (!motionModel) return;
  danceControllerPromise ??= import('./three/dance-controller').then((danceModule) => {
    danceController = danceModule.createDanceController(motionModel!, meshes);
  });
  await danceControllerPromise;
}
async function ensureGravityController() {
  if (gravityController) return;
  if (!motionModel) return;
  gravityControllerPromise ??= import('./three/gravity-controller').then(async (gravityModule) => {
    gravityController = await gravityModule.createGravityController(motionModel!);
  });
  await gravityControllerPromise;
}
loadSkeletonModel(
  createBoneRecord,
  async ({ model, bones: loadedBones, meshes: loadedMeshes, visualMeshes: loadedVisualMeshes }) => {
    scene.add(model);
    motionModel = model;
    meshes.push(...loadedMeshes);
    visualMeshes.push(...loadedVisualMeshes);
    bones = loadedBones;
    loadedBones.forEach((bone) => meshesByBoneId.set(bone.id, bone.meshes ?? []));
    boneIndex = createBoneIndex(bones);
    if (import.meta.env.DEV) {
      window.__ATLAS_AUDIT__ = auditBoneRelations(bones);
      window.__ATLAS_DATA_READY__ = true;
      if (window.__ATLAS_AUDIT__.unresolved.length) {
        console.warn('Relaciones anatómicas sin destino', window.__ATLAS_AUDIT__.unresolved);
      }
    }
    atlasState.setCollapsedRegions(bones.map((b) => b.region));
    renderList();
    updateProgress();
    const initialThumbnailCount = Math.min(20, bones.length);
    await generateThumbnails(0, initialThumbnailCount);
    const skeletonImage = isolatedBoneImage({ meshes } as Bone);
    generalInfo = generalInfo.replace(
      `<div class="detail-visual">${boneSvg}</div>`,
      `<div class="detail-visual"><img class="bone-render skeleton-render" src="${skeletonImage}" alt="Vista completa del esqueleto humano"></div>`
    );
    detail.innerHTML = generalInfo;
    await audioReady;
    danceButton.disabled = false;
    jogButton.disabled = false;
    gravityButton.disabled = false;
    renderList();
    if (import.meta.env.DEV) {
      window.__ATLAS_READY__ = true;
    }
    revealApplication();
    requestAnimationFrame(() => void generateThumbnails(initialThumbnailCount, bones.length));
  },
  (err) => {
    stopLoadingPhrases();
    console.error(err);
    const boot = document.querySelector<HTMLElement>('#boot-loader strong');
    if (boot) boot.textContent = 'No se pudo cargar el modelo';
    document.querySelector('.loader')!.innerHTML = '<strong>No se pudo cargar el modelo</strong>';
  }
);

let selected: Bone | undefined, hovered: THREE.Mesh | undefined;
const ray = new THREE.Raycaster(),
  mouse = new THREE.Vector2(),
  tooltip = document.querySelector<HTMLElement>('.tooltip')!;
function mat(mesh: THREE.Mesh) {
  return mesh.material as THREE.MeshStandardMaterial;
}
function restoreHover(mesh: THREE.Mesh) {
  const userData = meshUserData(mesh);
  if (userData.boneId === selected?.id) return;
  const m = mat(mesh);
  m.color.copy(userData.baseColor ?? new THREE.Color(0xffffff)).multiplyScalar(selected ? 0.82 : 1);
  m.emissive.set(0);
  m.emissiveIntensity = 0;
}
function updateBoneMaterials(bone: Bone | undefined, isSelected: boolean, hasSelection: boolean) {
  if (!bone) return;
  const meshesForBone = meshesByBoneId.get(bone.id) ?? [];
  meshesForBone.forEach((mesh) => updateMeshMaterial(mesh, isSelected, hasSelection));
}
function updateMeshMaterial(mesh: THREE.Mesh, isSelected: boolean, hasSelection: boolean) {
  const m = mat(mesh);
  if (isSelected) m.color.set(0xb96b43);
  else m.color.copy(meshUserData(mesh).baseColor ?? new THREE.Color(0xffffff));
  m.emissive.set(isSelected ? 0x57200b : 0);
  m.emissiveIntensity = isSelected ? 0.22 : 0;
  m.transparent = hasSelection && !isSelected;
  m.opacity = hasSelection ? (isSelected ? 1 : 0.16) : 1;
  m.depthWrite = !hasSelection || isSelected;
  m.needsUpdate = true;
}
type SelectOptions = {
  playCloseSound?: boolean;
  preserveCamera?: boolean;
  source?: BoneSelectionSource;
};

function select(b?: Bone, options: SelectOptions = {}) {
  const previous = selected;
  selected = b;
  if (b) atlasState.selectBone(b.id);
  else atlasState.clearSelection();
  if (!b && options.playCloseSound) {
    detailCloseAudio.currentTime = 0;
    detailCloseAudio.play().catch(() => undefined);
  }
  if (b) {
    boneClickAudio.currentTime = 0;
    boneClickAudio.play().catch(() => undefined);
    atlasState.markViewed(b.id);
    updateProgress();
    trackBoneView({
      boneId: b.id,
      boneName: b.name,
      region: b.region,
      source: options.source ?? 'model',
      bonesViewedCount: viewed.size,
    });
    trackExplorationMilestones(viewed.size, bones.length);
  }
  if (!b) {
    visualMeshes.forEach((mesh) => updateMeshMaterial(mesh, false, false));
  } else if (!previous) {
    visualMeshes.forEach((mesh) =>
      updateMeshMaterial(mesh, meshUserData(mesh).boneId === b.id, true)
    );
  } else {
    if (previous !== b) updateBoneMaterials(previous, false, Boolean(b));
    updateBoneMaterials(b, true, Boolean(b));
  }
  document
    .querySelectorAll('.bone-item')
    .forEach((el) => el.classList.toggle('active', (el as HTMLElement).dataset.id === b?.id));
  viewport.classList.toggle('detail-open', !!b);
  if (!b) {
    detail.classList.remove('open');
    mobileDetailSheet.close();
    detail.innerHTML = generalInfo;
    detail.scrollTop = 0;
    const preserveCamera = options.preserveCamera || atlasState.getState().motion !== null;
    if (preserveCamera) cameraController.resetFraming();
    else cameraController.reset();
    return;
  }
  let detailImage = detailImageCache.get(b.id);
  if (!detailImage) {
    detailImage = isolatedBoneImage(b);
    detailImageCache.set(b.id, detailImage);
  }
  detail.innerHTML = boneDetailMarkup(b, detailImage);
  detail.scrollTop = 0;
  detail.classList.add('open');
  const sheetHeight = mobileDetailSheet.open();
  cameraController.focus(b.meshes ?? [], sheetHeight);
  detail
    .querySelector('.close')!
    .addEventListener('click', () => select(undefined, { playCloseSound: true }));
  detail.querySelectorAll<HTMLElement>('.articulation-link').forEach((link) =>
    link.addEventListener('click', () => {
      const target = boneIndex.byName.get(
        (link.dataset.target || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('es')
      );
      if (target) {
        trackRelationFollow(b.name, target.name);
        select(target, { source: 'relation' });
      }
    })
  );
  document
    .querySelector<HTMLElement>(`.bone-item[data-id="${b.id}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  closeBoneList();
}
let pointerStart = { x: 0, y: 0 },
  didDrag = false;
const activePointers = new Set<number>();
canvas.addEventListener('pointerdown', (e) => {
  activePointers.add(e.pointerId);
  pointerStart = { x: e.clientX, y: e.clientY };
  didDrag = false;
  cameraController.cancel();
});
canvas.addEventListener('pointermove', (e) => {
  if (
    (e.buttons || e.pointerType === 'touch') &&
    Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 4
  ) {
    didDrag = true;
    if (e.pointerType === 'touch' && activePointers.size >= 2) {
      trackControlUsed('rotate');
      trackControlUsed('zoom');
    } else {
      trackControlUsed(e.metaKey || e.ctrlKey || e.shiftKey ? 'rotate' : 'pan');
    }
  }
});
controls.addEventListener('start', () => {
  cameraController.cancel();
});
function pointer(e: PointerEvent) {
  return intersection(e)?.object as THREE.Mesh | undefined;
}
function intersection(e: { clientX: number; clientY: number }) {
  const r = canvas.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  return ray.intersectObjects(meshes)[0];
}
function zoomAtPointer(e: { clientX: number; clientY: number }) {
  trackControlUsed('double_zoom');
  const hit = intersection(e);
  const target = hit?.point.clone() ?? new THREE.Vector3();
  if (!hit) {
    const viewDirection = camera.getWorldDirection(new THREE.Vector3());
    const targetPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      viewDirection,
      controls.target
    );
    if (!ray.ray.intersectPlane(targetPlane, target)) target.copy(controls.target);
  }
  cameraController.zoomTo(target);
}
canvas.addEventListener('pointermove', (e) => {
  const hit = pointer(e);
  if (hovered !== hit) {
    if (hovered) restoreHover(hovered);
    hovered = hit;
    if (hit && meshUserData(hit).boneId !== selected?.id) {
      const m = mat(hit);
      m.color.set(0xd5794c);
      m.emissive.set(0x6b260d);
      m.emissiveIntensity = 0.28;
    }
  }
  const hitBoneId = hit ? meshUserData(hit).boneId : undefined;
  const b = hitBoneId ? boneIndex.byId.get(hitBoneId) : undefined;
  tooltip.classList.toggle('visible', !!b);
  if (b) {
    tooltip.textContent = b.name;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
  }
});
canvas.addEventListener('pointerleave', () => {
  tooltip.classList.remove('visible');
  if (hovered) restoreHover(hovered);
  hovered = undefined;
});
canvas.addEventListener('click', (e) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  if (didDrag) return;
  const hit = pointer(e);
  if (hit)
    select(meshUserData(hit).boneId ? boneIndex.byId.get(meshUserData(hit).boneId!) : undefined, {
      source: 'model',
    });
  else select(undefined, { playCloseSound: !!selected });
});
canvas.addEventListener('wheel', () => trackControlUsed('zoom'), { passive: true });
canvas.addEventListener('dblclick', (e) => zoomAtPointer(e));
let lastTap = { time: 0, x: 0, y: 0 };
let suppressNextClick = false;
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch' || !e.isPrimary || didDrag) return;
  const now = performance.now();
  const isDoubleTap =
    now - lastTap.time < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28;
  lastTap = { time: now, x: e.clientX, y: e.clientY };
  if (!isDoubleTap) return;
  suppressNextClick = true;
  lastTap.time = 0;
  zoomAtPointer(e);
});
canvas.addEventListener('pointerup', (e) => activePointers.delete(e.pointerId));
canvas.addEventListener('pointercancel', (e) => activePointers.delete(e.pointerId));
list.addEventListener('click', (e) => {
  const region = (e.target as HTMLElement).closest<HTMLElement>('.region-title');
  if (region) {
    const name = region.dataset.region as BoneRegion;
    atlasState.toggleRegion(name as BoneRegion);
    renderList();
    return;
  }
  const btn = (e.target as HTMLElement).closest<HTMLElement>('.bone-item');
  if (btn)
    select(btn.dataset.id ? boneIndex.byId.get(btn.dataset.id) : undefined, {
      source: currentFilter.trim() ? 'search' : 'list',
    });
});
let searchAnalyticsTimer: number | undefined;
document.querySelector<HTMLInputElement>('#search')!.addEventListener('input', (e) => {
  const query = (e.target as HTMLInputElement).value;
  renderList(query);
  if (searchAnalyticsTimer !== undefined) window.clearTimeout(searchAnalyticsTimer);
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return;
  searchAnalyticsTimer = window.setTimeout(() => {
    const needle = normalizedQuery.toLocaleLowerCase('es');
    const resultsCount = bones.filter((bone) =>
      `${bone.name} ${bone.latin}`.toLocaleLowerCase('es').includes(needle)
    ).length;
    trackSearch(normalizedQuery.length, resultsCount);
  }, 600);
});
document.querySelector('.collapse-all')!.addEventListener('click', () => {
  const regions = [...new Set(bones.map((b) => b.region))];
  atlasState.setCollapsedRegions(collapsedRegions.size === regions.length ? [] : regions);
  renderList();
});
document.querySelectorAll('.reset-btn').forEach((button) =>
  button.addEventListener('click', () => {
    setMotionMode(null);
    if (gravityController?.active) gravityController.setActive(false);
    updateGravityButton(false);
    select();
  })
);
function openInfoModal() {
  infoModal.classList.add('open');
  infoModal.setAttribute('aria-hidden', 'false');
  infoModal.querySelector<HTMLButtonElement>('.info-close')?.focus();
  trackEvent('info_open', {});
}
function closeInfoModal() {
  infoModal.classList.remove('open');
  infoModal.setAttribute('aria-hidden', 'true');
  infoButton.focus();
}
infoButton.addEventListener('click', openInfoModal);
infoModal.querySelector('.info-close')!.addEventListener('click', closeInfoModal);
infoModal.addEventListener('click', (event) => {
  if (event.target === infoModal) closeInfoModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (shell.classList.contains('list-open')) closeBoneList();
  else if (infoModal.classList.contains('open')) closeInfoModal();
  else if (selected) select(undefined, { playCloseSound: true });
});
let pendingMotionTimer: number | undefined;
async function setMotionMode(mode: 'dance' | 'jog' | null) {
  atlasState.setMotion(mode);
  if (!danceController && !mode) return;
  await ensureDanceController();
  if (!danceController) return;
  if (pendingMotionTimer !== undefined) {
    window.clearTimeout(pendingMotionTimer);
    pendingMotionTimer = undefined;
  }
  if (mode && gravityController && (gravityController.active || gravityController.restoring)) {
    if (gravityController.active) {
      gravityController.setActive(false);
      updateGravityButton(false);
    }
    danceAudio.pause();
    runningAudio.pause();
    pendingMotionTimer = window.setTimeout(() => {
      pendingMotionTimer = undefined;
      void setMotionMode(mode);
    }, GRAVITY_RESTORE_DURATION_MS + 100);
    return;
  }
  if (mode) select(undefined, { preserveCamera: true });
  danceController.setMode(mode);
  trackMotionTransition(mode);
  const motionLabel = mode ? motionModeLabel(mode) : '';
  const dancing = mode === 'dance';
  const jogging = mode === 'jog';
  if (dancing) {
    danceAudio.load();
    danceAudio.play().catch(() => undefined);
  } else danceAudio.pause();
  if (jogging) {
    runningAudio.load();
    runningAudio.play().catch(() => undefined);
  } else runningAudio.pause();
  danceButton.classList.toggle('active', dancing);
  danceButton.setAttribute('aria-pressed', String(dancing));
  danceButton.setAttribute('aria-label', dancing ? `Detener ${motionLabel}` : 'Activar modo baile');
  danceButton.querySelector('span')!.textContent = dancing ? `Detener ${motionLabel}` : 'Bailar';
  jogButton.classList.toggle('active', jogging);
  jogButton.setAttribute('aria-pressed', String(jogging));
  jogButton.setAttribute('aria-label', jogging ? `Detener ${motionLabel}` : 'Activar modo trotar');
  jogButton.querySelector('span')!.textContent = jogging ? `Detener ${motionLabel}` : 'Trotar';
}
function updateGravityButton(active: boolean) {
  gravityButton.classList.toggle('active', active);
  gravityButton.setAttribute('aria-pressed', String(active));
  gravityButton.setAttribute('aria-label', active ? 'Reconstruir esqueleto' : 'Activar gravedad');
  gravityButton.title = active ? 'Reconstruir esqueleto' : 'Activar gravedad';
  trackMotionTransition(active ? 'gravity' : null);
  atlasState.setMotion(active ? 'gravity' : null);
  if (active) {
    fallingBonesAudio.load();
    fallingBonesAudio.currentTime = 0;
    fallingBonesAudio.play().catch(() => undefined);
  } else {
    fallingBonesAudio.pause();
    fallingBonesAudio.currentTime = 0;
  }
}
document.querySelector('.dance-btn')!.addEventListener('click', async () => {
  cameraController.hold();
  await ensureDanceController();
  await setMotionMode(danceController?.mode === 'dance' ? null : 'dance');
});
document.querySelector('.jog-btn')!.addEventListener('click', async () => {
  cameraController.hold();
  await ensureDanceController();
  await setMotionMode(danceController?.mode === 'jog' ? null : 'jog');
});
document.querySelector('.gravity-btn')!.addEventListener('click', async () => {
  cameraController.hold();
  await ensureGravityController();
  if (!gravityController) return;
  const next = !gravityController.active;
  if (next) {
    await setMotionMode(null);
    select(undefined, { preserveCamera: true });
  }
  gravityController.setActive(next);
  updateGravityButton(next);
});
function setBoneListOpen(open: boolean) {
  shell.classList.toggle('list-open', open);
  mobileNav.setAttribute('aria-expanded', String(open));
  sidebarBackdrop.tabIndex = open ? 0 : -1;
}
function closeBoneList() {
  setBoneListOpen(false);
}
mobileNav.addEventListener('click', () => setBoneListOpen(!shell.classList.contains('list-open')));
sidebarClose.addEventListener('click', closeBoneList);
sidebarBackdrop.addEventListener('click', closeBoneList);

function resize() {
  const r = canvas.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
new ResizeObserver(resize).observe(canvas);
resize();
let previousFrame = performance.now();
let renderPaused = document.visibilityState === 'hidden';
document.addEventListener('visibilitychange', () => {
  renderPaused = document.visibilityState === 'hidden';
  previousFrame = performance.now();
  if (!renderPaused) requestAnimationFrame(animate);
});
function animate(now = performance.now()) {
  if (renderPaused) return;
  requestAnimationFrame(animate);
  const frameDelta = (now - previousFrame) / 1000;
  const delta = Math.min(frameDelta, 0.05);
  previousFrame = now;
  danceController?.update(delta);
  gravityController?.update(delta);
  cameraController.update(Math.min(frameDelta, 0.25));
  controls.update();
  renderer.render(scene, camera);
}
animate();
