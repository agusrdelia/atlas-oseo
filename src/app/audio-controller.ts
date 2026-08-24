import { preloadAudio } from '../ui/loading';

export function createAudioController() {
  const dance = new Audio('/audio/dance.mp3');
  dance.loop = true;
  dance.preload = 'metadata';
  const running = new Audio('/audio/running.mp3');
  running.loop = true;
  running.preload = 'metadata';
  const fallingBones = new Audio('/audio/bones.mp3');
  fallingBones.preload = 'metadata';
  const boneClick = new Audio('/audio/click.mp3');
  boneClick.preload = 'auto';
  const detailClose = new Audio('/audio/swoosh.mp3');
  detailClose.preload = 'auto';
  return {
    dance,
    running,
    fallingBones,
    boneClick,
    detailClose,
    ready: preloadAudio([boneClick, detailClose]),
    destroy() {
      [dance, running, fallingBones, boneClick, detailClose].forEach((audio) => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
    },
  };
}
