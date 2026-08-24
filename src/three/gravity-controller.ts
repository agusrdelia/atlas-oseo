import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

type FallingBone = {
  mesh: THREE.Mesh;
  parent: THREE.Object3D;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  localCenter: THREE.Vector3;
  localHalfSize: THREE.Vector3;
  rigidBody: RAPIER.RigidBody | undefined;
  colliderHandle: number | undefined;
  hasHitFloor: boolean;
  isLong: boolean;
  isLegLong: boolean;
  restoreFromPosition: THREE.Vector3;
  restoreFromQuaternion: THREE.Quaternion;
  restoreFromScale: THREE.Vector3;
  restoreTargetPosition: THREE.Vector3;
  restoreTargetQuaternion: THREE.Quaternion;
  restoreTargetScale: THREE.Vector3;
};

const originalLocalMatrix = new THREE.Matrix4();
const targetWorldMatrix = new THREE.Matrix4();
const targetRootMatrix = new THREE.Matrix4();
const inverseRootMatrix = new THREE.Matrix4();
const RESTORE_DURATION = 0.85;
export const GRAVITY_RESTORE_DURATION_MS = RESTORE_DURATION * 1000;
const PHYSICS_STEP = 1 / 45;
const FLOOR_COLLISION_GROUP = 0x00010002;
const BONE_COLLISION_GROUP = 0x00020001;

export async function createGravityController(model: THREE.Group) {
  await RAPIER.init();

  model.updateMatrixWorld(true);
  const modelBounds = new THREE.Box3().setFromObject(model);
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const gravityRoot = new THREE.Group();
  gravityRoot.name = 'GravityRoot';
  model.add(gravityRoot);
  model.updateMatrixWorld(true);
  const floorY = gravityRoot.worldToLocal(new THREE.Vector3(0, modelBounds.min.y, 0)).y;
  const bodies: FallingBone[] = [];

  model.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const geometryBounds = mesh.geometry.boundingBox;
    if (!geometryBounds || !mesh.parent) return;
    const localHalfSize = geometryBounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    bodies.push({
      mesh,
      parent: mesh.parent,
      position: mesh.position.clone(),
      quaternion: mesh.quaternion.clone(),
      scale: mesh.scale.clone(),
      localCenter: geometryBounds.getCenter(new THREE.Vector3()),
      localHalfSize,
      rigidBody: undefined,
      colliderHandle: undefined,
      hasHitFloor: false,
      isLong:
        Math.max(localHalfSize.x, localHalfSize.y, localHalfSize.z) /
          Math.max(Math.min(localHalfSize.x, localHalfSize.y, localHalfSize.z), 0.0001) >
        3.2,
      isLegLong: /femur|tibia|fibula/i.test(mesh.name),
      restoreFromPosition: new THREE.Vector3(),
      restoreFromQuaternion: new THREE.Quaternion(),
      restoreFromScale: new THREE.Vector3(),
      restoreTargetPosition: new THREE.Vector3(),
      restoreTargetQuaternion: new THREE.Quaternion(),
      restoreTargetScale: new THREE.Vector3(),
    });
  });

  let state: 'idle' | 'falling' | 'restoring' = 'idle';
  let elapsed = 0;
  let accumulator = 0;
  let world: RAPIER.World | undefined;
  let eventQueue: RAPIER.EventQueue | undefined;
  const colliderBodies = new Map<number, FallingBone>();

  function restore() {
    world?.free();
    eventQueue?.free();
    world = undefined;
    eventQueue = undefined;
    colliderBodies.clear();
    bodies.forEach((body) => {
      body.rigidBody = undefined;
      body.colliderHandle = undefined;
      body.parent.add(body.mesh);
      body.mesh.position.copy(body.position);
      body.mesh.quaternion.copy(body.quaternion);
      body.mesh.scale.copy(body.scale);
    });
    model.updateMatrixWorld(true);
    state = 'idle';
  }

  function createPhysicsWorld() {
    const physicsWorld = new RAPIER.World({ x: 0, y: -modelSize.y * 3.4, z: 0 });
    physicsWorld.numSolverIterations = 2;
    physicsWorld.numAdditionalFrictionIterations = 1;
    physicsWorld.integrationParameters.maxCcdSubsteps = 0;
    const floorThickness = Math.max(modelSize.y * 0.04, 0.01);
    const floorRadius = Math.max(modelSize.x, modelSize.z, modelSize.y) * 3;
    const floorBody = physicsWorld.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, floorY - floorThickness, 0)
    );
    physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(floorRadius, floorThickness, floorRadius)
        .setFriction(0.82)
        .setRestitution(0.08)
        .setCollisionGroups(FLOOR_COLLISION_GROUP),
      floorBody
    );
    return physicsWorld;
  }

  function release() {
    model.updateMatrixWorld(true);
    world = createPhysicsWorld();
    eventQueue = new RAPIER.EventQueue(true);
    colliderBodies.clear();
    accumulator = 0;

    bodies.forEach((body) => {
      gravityRoot.attach(body.mesh);
      const { position, quaternion, scale } = body.mesh;
      const rigidBody = world!.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(position.x, position.y, position.z)
          .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w })
          .setLinearDamping(0.18)
          .setAngularDamping(0.22)
      );
      const center = body.localCenter.clone().multiply(scale);
      const halfSize = body.localHalfSize
        .clone()
        .multiply(new THREE.Vector3(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)));
      const minSize = modelSize.y * 0.0005;
      const collider = world!.createCollider(
        RAPIER.ColliderDesc.cuboid(
          Math.max(halfSize.x, minSize),
          Math.max(halfSize.y, minSize),
          Math.max(halfSize.z, minSize)
        )
          .setTranslation(center.x, center.y, center.z)
          .setDensity(1)
          .setFriction(0.72)
          .setRestitution(0.12)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
          .setCollisionGroups(BONE_COLLISION_GROUP),
        rigidBody
      );
      body.rigidBody = rigidBody;
      body.colliderHandle = collider.handle;
      body.hasHitFloor = false;
      colliderBodies.set(collider.handle, body);
    });

    state = 'falling';
  }

  function beginRestore() {
    model.updateMatrixWorld(true);
    gravityRoot.updateMatrixWorld(true);
    inverseRootMatrix.copy(gravityRoot.matrixWorld).invert();
    world?.free();
    eventQueue?.free();
    world = undefined;
    eventQueue = undefined;
    colliderBodies.clear();

    bodies.forEach((body) => {
      body.rigidBody = undefined;
      body.colliderHandle = undefined;
      body.restoreFromPosition.copy(body.mesh.position);
      body.restoreFromQuaternion.copy(body.mesh.quaternion);
      body.restoreFromScale.copy(body.mesh.scale);

      body.parent.updateWorldMatrix(true, false);
      originalLocalMatrix.compose(body.position, body.quaternion, body.scale);
      targetWorldMatrix.multiplyMatrices(body.parent.matrixWorld, originalLocalMatrix);
      targetRootMatrix.multiplyMatrices(inverseRootMatrix, targetWorldMatrix);
      targetRootMatrix.decompose(
        body.restoreTargetPosition,
        body.restoreTargetQuaternion,
        body.restoreTargetScale
      );
    });

    elapsed = 0;
    state = 'restoring';
  }

  function setActive(next: boolean) {
    if (next) {
      if (state === 'falling') return;
      if (state === 'restoring') restore();
      elapsed = 0;
      release();
      return;
    }
    if (state !== 'falling') return;
    beginRestore();
  }

  function update(delta: number) {
    if (state === 'idle') return;
    elapsed += delta;

    if (state === 'restoring') {
      const progress = Math.min(elapsed / RESTORE_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      bodies.forEach((body) => {
        body.mesh.position.lerpVectors(body.restoreFromPosition, body.restoreTargetPosition, eased);
        body.mesh.quaternion.slerpQuaternions(
          body.restoreFromQuaternion,
          body.restoreTargetQuaternion,
          eased
        );
        body.mesh.scale.lerpVectors(body.restoreFromScale, body.restoreTargetScale, eased);
      });
      if (progress === 1) restore();
      return;
    }

    if (!world) return;
    accumulator = Math.min(accumulator + delta, PHYSICS_STEP * 2);
    while (accumulator >= PHYSICS_STEP) {
      world.timestep = PHYSICS_STEP;
      world.step(eventQueue);
      eventQueue?.drainCollisionEvents((handle1, handle2, started) => {
        if (!started) return;
        const body = colliderBodies.get(handle1) ?? colliderBodies.get(handle2);
        if (!body?.rigidBody || body.hasHitFloor) return;
        body.hasHitFloor = true;
        const direction = Math.sin((body.rigidBody.handle + 1) * 17.17) < 0 ? -1 : 1;
        const currentVelocity = body.rigidBody.linvel();
        const spin = body.isLegLong ? 6.2 : body.isLong ? 3.2 : 1.1;
        const lateralVelocity = body.isLegLong ? 0.12 : 0.045;
        body.rigidBody.setLinvel(
          {
            x: currentVelocity.x + direction * modelSize.x * lateralVelocity,
            y: Math.max(
              -currentVelocity.y * (body.isLegLong ? 0.24 : 0.16),
              modelSize.y * (body.isLegLong ? 0.08 : 0.055)
            ),
            z: currentVelocity.z - direction * modelSize.z * (body.isLegLong ? 0.065 : 0.025),
          },
          true
        );
        body.rigidBody.setAngvel(
          { x: direction * spin * 0.65, y: direction * 0.22, z: -direction * spin },
          true
        );
      });
      accumulator -= PHYSICS_STEP;
    }

    bodies.forEach((body) => {
      if (!body.rigidBody || body.rigidBody.isSleeping()) return;
      const position = body.rigidBody.translation();
      const rotation = body.rigidBody.rotation();
      body.mesh.position.set(position.x, position.y, position.z);
      body.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
  }

  return {
    setActive,
    update,
    get active() {
      return state === 'falling';
    },
    get restoring() {
      return state === 'restoring';
    },
  };
}
