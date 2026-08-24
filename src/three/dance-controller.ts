import * as THREE from 'three';
import { meshUserData } from './mesh-user-data';

type DancePart = {
  group: THREE.Group;
  restPosition: THREE.Vector3;
};

type MotionKey = readonly [phase: number, value: number];

function sampleMotion(keys: readonly MotionKey[], phase: number) {
  const wrapped = ((phase % 1) + 1) % 1;
  for (let index = 1; index < keys.length; index += 1) {
    const [endPhase, endValue] = keys[index]!;
    if (wrapped > endPhase) continue;
    const [startPhase, startValue] = keys[index - 1]!;
    const linear = (wrapped - startPhase) / (endPhase - startPhase);
    const eased = linear * linear * (3 - 2 * linear);
    return THREE.MathUtils.lerp(startValue, endValue, eased);
  }
  return keys.at(-1)?.[1] ?? 0;
}

const RUN_HIP: readonly MotionKey[] = [
  [0, -0.76],
  [0.16, -0.5],
  [0.34, 0.02],
  [0.5, 0.35],
  [0.64, 0.12],
  [0.8, -0.38],
  [1, -0.76],
];

const RUN_KNEE: readonly MotionKey[] = [
  [0, 0.3],
  [0.16, 0.42],
  [0.34, 0.22],
  [0.5, 0.3],
  [0.64, 1.66],
  [0.8, 1.28],
  [1, 0.3],
];

const RUN_ANKLE: readonly MotionKey[] = [
  [0, -0.14],
  [0.16, 0.02],
  [0.34, -0.1],
  [0.5, 0.48],
  [0.64, -0.18],
  [0.8, -0.26],
  [1, -0.14],
];

function sideOf(mesh: THREE.Mesh) {
  const declared = meshUserData(mesh).anatomicalSide;
  if (declared) return declared;
  if (/(?:[._]|\s)(?:l|left)$/i.test(mesh.name)) return 'izquierdo';
  if (/(?:[._]|\s)(?:r|right)$/i.test(mesh.name)) return 'derecho';
  return '';
}

function isArm(name: string) {
  if (/foot/i.test(name)) return false;
  return /humerus|radius|ulna|metacarpal|phalanx|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|sesamoid.*hand/i.test(
    name
  );
}

function isLeg(name: string) {
  return /femur|patella|tibia|fibula|calcaneus|talus|navicular|cuboid|cuneiform|metatarsal|phalanx.*foot|sesamoid.*foot/i.test(
    name
  );
}

function isForearmOrHand(name: string) {
  if (/foot/i.test(name)) return false;
  return /radius|ulna|metacarpal|phalanx|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|sesamoid.*hand/i.test(
    name
  );
}

function isHand(name: string) {
  if (/foot/i.test(name)) return false;
  return /metacarpal|phalanx|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|sesamoid.*hand/i.test(
    name
  );
}

function isFinger(name: string) {
  return /phalanx.*finger/i.test(name) && !/foot/i.test(name);
}

function isLowerLegOrFoot(name: string) {
  return /patella|tibia|fibula|calcaneus|talus|navicular|cuboid|cuneiform|metatarsal|phalanx.*foot|sesamoid.*foot/i.test(
    name
  );
}

function isFoot(name: string) {
  return /calcaneus|talus|navicular|cuboid|cuneiform|metatarsal|phalanx.*foot|sesamoid.*foot/i.test(
    name
  );
}

function isPelvis(name: string) {
  return /hip bone|os coxae|sacrum|coccyx/i.test(name);
}

function isHead(name: string) {
  return /ethmoid|frontal|mandible|occipital|parietal|sphenoid|vomer|temporal|maxilla|zygomatic|nasal|lacrimal|palatine|concha|tooth|teeth|incisor|canine|premolar|molar/i.test(
    name
  );
}

function createPart(
  model: THREE.Group,
  name: string,
  pivotWorld: THREE.Vector3,
  meshes: THREE.Mesh[]
): DancePart {
  const group = new THREE.Group();
  group.name = `Dance_${name}`;
  group.position.copy(model.worldToLocal(pivotWorld.clone()));
  model.add(group);
  model.updateMatrixWorld(true);
  meshes.forEach((mesh) => group.attach(mesh));
  return { group, restPosition: group.position.clone() };
}

function shoulderPivot(armMeshes: THREE.Mesh[], fallback: THREE.Vector3) {
  const humerus = armMeshes.find((mesh) => /humerus/i.test(mesh.name));
  if (!humerus) return fallback;
  const bounds = new THREE.Box3().setFromObject(humerus);
  const positions = humerus.geometry.getAttribute('position');
  if (!positions) return bounds.getCenter(new THREE.Vector3()).setY(bounds.max.y);

  const upperBand = bounds.max.y - (bounds.max.y - bounds.min.y) * 0.12;
  const pivot = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  let count = 0;
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index).applyMatrix4(humerus.matrixWorld);
    if (vertex.y < upperBand) continue;
    pivot.add(vertex);
    count += 1;
  }
  return count ? pivot.multiplyScalar(1 / count) : fallback;
}

function elbowPivot(armMeshes: THREE.Mesh[], fallback: THREE.Vector3) {
  const humerus = armMeshes.find((mesh) => /humerus/i.test(mesh.name));
  if (!humerus) return fallback;
  const bounds = new THREE.Box3().setFromObject(humerus);
  const positions = humerus.geometry.getAttribute('position');
  if (!positions) return bounds.getCenter(new THREE.Vector3()).setY(bounds.min.y);

  const lowerBand = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.12;
  const pivot = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  let count = 0;
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index).applyMatrix4(humerus.matrixWorld);
    if (vertex.y > lowerBand) continue;
    pivot.add(vertex);
    count += 1;
  }
  return count ? pivot.multiplyScalar(1 / count) : fallback;
}

function wristPivot(armMeshes: THREE.Mesh[], fallback: THREE.Vector3) {
  const proximalCarpals = armMeshes.filter((mesh) =>
    /scaphoid|lunate|triquetrum|pisiform/i.test(mesh.name)
  );
  if (!proximalCarpals.length) return fallback;
  const bounds = new THREE.Box3();
  proximalCarpals.forEach((mesh) => bounds.expandByObject(mesh));
  const pivot = bounds.getCenter(new THREE.Vector3());
  pivot.y = bounds.max.y;
  return pivot;
}

function upperEndPivot(mesh: THREE.Mesh) {
  const bounds = new THREE.Box3().setFromObject(mesh);
  const pivot = bounds.getCenter(new THREE.Vector3());
  pivot.y = bounds.max.y;
  return pivot;
}

type FingerRig = {
  finger: number;
  proximal: DancePart;
  middle: DancePart | undefined;
  distal: DancePart;
};

function createFingerRigs(parent: THREE.Group, armMeshes: THREE.Mesh[], side: string) {
  const ordinalPatterns = [/1st/i, /2d|2nd/i, /3d|3rd/i, /4th/i, /5th/i];
  return ordinalPatterns.flatMap<FingerRig>((ordinal, index) => {
    const fingerMeshes = armMeshes.filter((mesh) => isFinger(mesh.name) && ordinal.test(mesh.name));
    const proximalMesh = fingerMeshes.find((mesh) => /proximal/i.test(mesh.name));
    const distalMesh = fingerMeshes.find((mesh) => /distal/i.test(mesh.name));
    if (!proximalMesh || !distalMesh) return [];
    const middleMesh = fingerMeshes.find((mesh) => /middle/i.test(mesh.name));
    const proximal = createPart(
      parent,
      `${side}Finger${index + 1}Proximal`,
      upperEndPivot(proximalMesh),
      fingerMeshes
    );
    const middle = middleMesh
      ? createPart(proximal.group, `${side}Finger${index + 1}Middle`, upperEndPivot(middleMesh), [
          middleMesh,
          distalMesh,
        ])
      : undefined;
    const distal = createPart(
      middle?.group ?? proximal.group,
      `${side}Finger${index + 1}Distal`,
      upperEndPivot(distalMesh),
      [distalMesh]
    );
    return [{ finger: index + 1, proximal, middle, distal }];
  });
}

function kneePivot(legMeshes: THREE.Mesh[], fallback: THREE.Vector3) {
  const femur = legMeshes.find((mesh) => /femur/i.test(mesh.name));
  if (!femur) return fallback;
  const bounds = new THREE.Box3().setFromObject(femur);
  const pivot = bounds.getCenter(new THREE.Vector3());
  pivot.y = bounds.min.y;
  return pivot;
}

function hipPivot(legMeshes: THREE.Mesh[], fallback: THREE.Vector3) {
  const femur = legMeshes.find((mesh) => /femur/i.test(mesh.name));
  if (!femur) return fallback;
  return upperEndPivot(femur);
}

function anklePivot(legMeshes: THREE.Mesh[], fallback: THREE.Vector3) {
  const lowerLeg = legMeshes.filter((mesh) => /tibia|fibula/i.test(mesh.name));
  if (!lowerLeg.length) return fallback;
  const bounds = new THREE.Box3();
  lowerLeg.forEach((mesh) => bounds.expandByObject(mesh));
  const pivot = bounds.getCenter(new THREE.Vector3());
  pivot.y = bounds.min.y;
  return pivot;
}

export function createDanceController(model: THREE.Group, meshes: THREE.Mesh[]) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const atHeight = (ratio: number) => bounds.min.y + size.y * ratio;
  const atSide = (side: number, ratio: number) => center.x + size.x * ratio * side;

  const leftArmMeshes = meshes.filter((mesh) => isArm(mesh.name) && sideOf(mesh) === 'izquierdo');
  const rightArmMeshes = meshes.filter((mesh) => isArm(mesh.name) && sideOf(mesh) === 'derecho');
  const leftLegMeshes = meshes.filter((mesh) => isLeg(mesh.name) && sideOf(mesh) === 'izquierdo');
  const rightLegMeshes = meshes.filter((mesh) => isLeg(mesh.name) && sideOf(mesh) === 'derecho');
  const sceneMeshes: THREE.Mesh[] = [];
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) sceneMeshes.push(object as THREE.Mesh);
  });
  const headMeshes = sceneMeshes.filter((mesh) => isHead(mesh.name));

  const leftArm = createPart(
    model,
    'LeftArm',
    shoulderPivot(leftArmMeshes, new THREE.Vector3(atSide(-1, 0.18), atHeight(0.76), center.z)),
    leftArmMeshes
  );
  const rightArm = createPart(
    model,
    'RightArm',
    shoulderPivot(rightArmMeshes, new THREE.Vector3(atSide(1, 0.18), atHeight(0.76), center.z)),
    rightArmMeshes
  );
  const leftForearm = createPart(
    leftArm.group,
    'LeftForearm',
    elbowPivot(leftArmMeshes, new THREE.Vector3(atSide(-1, 0.24), atHeight(0.61), center.z)),
    leftArmMeshes.filter((mesh) => isForearmOrHand(mesh.name))
  );
  const rightForearm = createPart(
    rightArm.group,
    'RightForearm',
    elbowPivot(rightArmMeshes, new THREE.Vector3(atSide(1, 0.24), atHeight(0.61), center.z)),
    rightArmMeshes.filter((mesh) => isForearmOrHand(mesh.name))
  );
  const leftHand = createPart(
    leftForearm.group,
    'LeftHand',
    wristPivot(leftArmMeshes, new THREE.Vector3(atSide(-1, 0.24), atHeight(0.49), center.z)),
    leftArmMeshes.filter((mesh) => isHand(mesh.name))
  );
  const rightHand = createPart(
    rightForearm.group,
    'RightHand',
    wristPivot(rightArmMeshes, new THREE.Vector3(atSide(1, 0.24), atHeight(0.49), center.z)),
    rightArmMeshes.filter((mesh) => isHand(mesh.name))
  );
  const leftFingers = createFingerRigs(leftHand.group, leftArmMeshes, 'Left');
  const rightFingers = createFingerRigs(rightHand.group, rightArmMeshes, 'Right');
  const pelvis = createPart(
    model,
    'Pelvis',
    new THREE.Vector3(center.x, atHeight(0.48), center.z),
    sceneMeshes.filter((mesh) => isPelvis(mesh.name))
  );
  const leftLeg = createPart(
    pelvis.group,
    'LeftLeg',
    hipPivot(leftLegMeshes, new THREE.Vector3(atSide(-1, 0.08), atHeight(0.48), center.z)),
    leftLegMeshes
  );
  const rightLeg = createPart(
    pelvis.group,
    'RightLeg',
    hipPivot(rightLegMeshes, new THREE.Vector3(atSide(1, 0.08), atHeight(0.48), center.z)),
    rightLegMeshes
  );
  const leftLowerLeg = createPart(
    leftLeg.group,
    'LeftLowerLeg',
    kneePivot(leftLegMeshes, new THREE.Vector3(atSide(-1, 0.08), atHeight(0.27), center.z)),
    leftLegMeshes.filter((mesh) => isLowerLegOrFoot(mesh.name))
  );
  const rightLowerLeg = createPart(
    rightLeg.group,
    'RightLowerLeg',
    kneePivot(rightLegMeshes, new THREE.Vector3(atSide(1, 0.08), atHeight(0.27), center.z)),
    rightLegMeshes.filter((mesh) => isLowerLegOrFoot(mesh.name))
  );
  const leftFoot = createPart(
    leftLowerLeg.group,
    'LeftFoot',
    anklePivot(leftLegMeshes, new THREE.Vector3(atSide(-1, 0.08), atHeight(0.08), center.z)),
    leftLegMeshes.filter((mesh) => isFoot(mesh.name))
  );
  const rightFoot = createPart(
    rightLowerLeg.group,
    'RightFoot',
    anklePivot(rightLegMeshes, new THREE.Vector3(atSide(1, 0.08), atHeight(0.08), center.z)),
    rightLegMeshes.filter((mesh) => isFoot(mesh.name))
  );
  const head = createPart(
    model,
    'Head',
    new THREE.Vector3(center.x, atHeight(0.84), center.z),
    headMeshes
  );
  const restModelPosition = model.position.clone();
  const restModelRotation = model.rotation.clone();
  let mode: 'dance' | 'jog' | null = null;
  let danceMix = 0;
  let jogMix = 0;
  let elapsed = 0;

  function setActive(next: boolean) {
    mode = next ? 'dance' : null;
  }

  function setMode(next: 'dance' | 'jog' | null) {
    mode = next;
  }

  function update(delta: number) {
    elapsed += delta;
    danceMix = THREE.MathUtils.damp(danceMix, mode === 'dance' ? 1 : 0, 6, delta);
    jogMix = THREE.MathUtils.damp(jogMix, mode === 'jog' ? 1 : 0, 6, delta);
    const beat = Math.sin(elapsed * 5.2);
    const sway = Math.sin(elapsed * 2.6);
    const counterSway = Math.sin(elapsed * 2.6 + Math.PI);
    const leftPulse = (Math.sin(elapsed * 5.2) + 1) * 0.5;
    const rightPulse = (Math.sin(elapsed * 5.2 + Math.PI) + 1) * 0.5;
    const leftKneeFlex = 0.1 + leftPulse * 0.24;
    const rightKneeFlex = 0.1 + rightPulse * 0.24;
    const gaitPhase = elapsed * 6.8;
    const leftPhase = (((gaitPhase / (Math.PI * 2)) % 1) + 1) % 1;
    const rightPhase = (leftPhase + 0.5) % 1;
    const leftHipAngle = sampleMotion(RUN_HIP, leftPhase);
    const rightHipAngle = sampleMotion(RUN_HIP, rightPhase);
    const leftKneeAngle = sampleMotion(RUN_KNEE, leftPhase);
    const rightKneeAngle = sampleMotion(RUN_KNEE, rightPhase);
    const leftAnkleAngle = sampleMotion(RUN_ANKLE, leftPhase);
    const rightAnkleAngle = sampleMotion(RUN_ANKLE, rightPhase);
    const stride = (rightHipAngle - leftHipAngle) / 1.11;
    const flight = Math.sin(leftPhase * Math.PI * 2) ** 2;

    model.position.copy(restModelPosition);
    model.position.y +=
      Math.max(0, beat) * size.y * 0.012 * danceMix + flight * size.y * 0.019 * jogMix;
    model.rotation.copy(restModelRotation);
    model.rotation.x += 0.09 * jogMix;
    model.rotation.y += sway * 0.08 * danceMix - stride * 0.025 * jogMix;
    model.rotation.z += sway * 0.035 * danceMix + stride * 0.012 * jogMix;

    pelvis.group.rotation.set(0, stride * 0.07 * jogMix, stride * 0.015 * jogMix);
    leftArm.group.rotation.set(
      counterSway * 0.09 * danceMix - leftHipAngle * 0.48 * jogMix,
      0,
      (1.55 + leftPulse * 0.55) * danceMix - 0.11 * jogMix
    );
    rightArm.group.rotation.set(
      sway * 0.09 * danceMix - rightHipAngle * 0.48 * jogMix,
      0,
      -(1.55 + rightPulse * 0.55) * danceMix + 0.11 * jogMix
    );
    leftForearm.group.rotation.set(
      (-1.5 - leftKneeAngle * 0.045) * jogMix,
      -sway * 0.08 * danceMix,
      (1.25 + rightPulse * 0.35) * danceMix
    );
    rightForearm.group.rotation.set(
      (-1.5 - rightKneeAngle * 0.045) * jogMix,
      sway * 0.08 * danceMix,
      -(1.25 + leftPulse * 0.35) * danceMix
    );
    leftHand.group.rotation.set(0, -1.35 * jogMix, 0);
    rightHand.group.rotation.set(0, 1.35 * jogMix, 0);

    leftFingers.forEach(({ finger, proximal, middle, distal }) => {
      const thumb = finger === 1;
      proximal.group.rotation.set(-(thumb ? 0.58 : 1.08) * jogMix, 0, (thumb ? -0.72 : 0) * jogMix);
      middle?.group.rotation.set(-1.14 * jogMix, 0, 0);
      distal.group.rotation.set(-(thumb ? 0.7 : 0.82) * jogMix, 0, 0);
    });
    rightFingers.forEach(({ finger, proximal, middle, distal }) => {
      const thumb = finger === 1;
      proximal.group.rotation.set(-(thumb ? 0.58 : 1.08) * jogMix, 0, (thumb ? 0.72 : 0) * jogMix);
      middle?.group.rotation.set(-1.14 * jogMix, 0, 0);
      distal.group.rotation.set(-(thumb ? 0.7 : 0.82) * jogMix, 0, 0);
    });

    leftLeg.group.rotation.set(
      -leftKneeFlex * 0.42 * danceMix + leftHipAngle * jogMix,
      0,
      sway * 0.025 * danceMix
    );
    rightLeg.group.rotation.set(
      -rightKneeFlex * 0.42 * danceMix + rightHipAngle * jogMix,
      0,
      -sway * 0.025 * danceMix
    );
    leftLowerLeg.group.rotation.set(leftKneeFlex * danceMix + leftKneeAngle * jogMix, 0, 0);
    rightLowerLeg.group.rotation.set(rightKneeFlex * danceMix + rightKneeAngle * jogMix, 0, 0);
    leftFoot.group.rotation.set(leftAnkleAngle * jogMix, 0, 0);
    rightFoot.group.rotation.set(rightAnkleAngle * jogMix, 0, 0);
    head.group.rotation.set(
      -beat * 0.055 * danceMix - 0.025 * jogMix,
      sway * 0.14 * danceMix - stride * 0.025 * jogMix,
      -sway * 0.085 * danceMix
    );
  }

  return {
    setActive,
    setMode,
    update,
    get active() {
      return mode === 'dance';
    },
    get mode() {
      return mode;
    },
  };
}
