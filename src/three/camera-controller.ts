import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type CameraControllerOptions = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  canvas: HTMLCanvasElement;
  homePosition: THREE.Vector3;
  homeTarget: THREE.Vector3;
};

export function createCameraController({
  camera,
  controls,
  canvas,
  homePosition,
  homeTarget,
}: CameraControllerOptions) {
  let goal: { pos: THREE.Vector3; target: THREE.Vector3 } | undefined;
  function hold() {
    goal = undefined;
    const position = camera.position.clone();
    const target = controls.target.clone();
    const dampingEnabled = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    camera.position.copy(position);
    controls.target.copy(target);
    controls.update();
    controls.enableDamping = dampingEnabled;
  }
  function resetFraming() {
    hold();
    const direction = camera.position.clone().sub(controls.target).normalize();
    const distance = homePosition.distanceTo(homeTarget);
    goal = {
      pos: homeTarget.clone().addScaledVector(direction, distance),
      target: homeTarget.clone(),
    };
  }
  function focus(meshes: THREE.Mesh[], obstructedHeight = 0) {
    const bounds = new THREE.Box3();
    meshes.forEach((mesh) => bounds.expandByObject(mesh));
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3()).length();
    const direction = camera.position.clone().sub(controls.target).normalize();
    const distance = Math.max(size * 2.2, 0.24);
    const target = center.clone();
    const position = center.clone().addScaledVector(direction, distance);
    if (obstructedHeight > 0) {
      const canvasHeight = canvas.getBoundingClientRect().height;
      const worldHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const shift = (obstructedHeight / 2 / canvasHeight) * worldHeight;
      const cameraUp = camera.up.clone().applyQuaternion(camera.quaternion).normalize();
      target.addScaledVector(cameraUp, -shift);
      position.addScaledVector(cameraUp, -shift);
    }
    goal = { pos: position, target };
  }
  return {
    cancel: () => {
      goal = undefined;
    },
    focus,
    hold,
    resetFraming,
    reset: () => {
      goal = { pos: homePosition.clone(), target: homeTarget.clone() };
    },
    update: (delta = 1 / 60) => {
      if (!goal) return;
      const blend = 1 - Math.exp(-12 * delta);
      camera.position.lerp(goal.pos, blend);
      controls.target.lerp(goal.target, blend);
      if (
        camera.position.distanceTo(goal.pos) < 0.01 &&
        controls.target.distanceTo(goal.target) < 0.01
      ) {
        camera.position.copy(goal.pos);
        controls.target.copy(goal.target);
        goal = undefined;
      }
    },
    zoomTo: (target: THREE.Vector3) => {
      const direction = camera.position.clone().sub(controls.target).normalize();
      const distance = Math.max(
        controls.minDistance,
        camera.position.distanceTo(controls.target) * 0.55
      );
      goal = { pos: target.clone().addScaledVector(direction, distance), target };
    },
  };
}
