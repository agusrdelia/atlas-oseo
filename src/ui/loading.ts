// Loading-screen copy and animation lifecycle.
const phrases = [
  'Generando estructura ósea',
  'Ensamblando huesos',
  'Articulando el esqueleto',
  'Preparando el atlas anatómico',
];

export function startLoadingPhrases(title: HTMLElement) {
  let phraseIndex = 0;
  let typeTimer = 0;
  let phraseTimer = 0;

  const typePhrase = () => {
    const text = phrases[phraseIndex]!;
    title.textContent = '';
    let characterIndex = 0;
    const delay = 300 / text.length;
    const typeNext = () => {
      title.textContent = text.slice(0, ++characterIndex);
      if (characterIndex < text.length) {
        typeTimer = window.setTimeout(typeNext, delay);
      } else {
        phraseTimer = window.setTimeout(() => {
          phraseIndex = (phraseIndex + 1) % phrases.length;
          typePhrase();
        }, 2000);
      }
    };
    typeNext();
  };

  typePhrase();
  return () => {
    clearTimeout(typeTimer);
    clearTimeout(phraseTimer);
    (window as Window & { __stopBootLoader?: () => void }).__stopBootLoader?.();
  };
}

export function preloadAudio(tracks: HTMLAudioElement[]) {
  return Promise.all(
    tracks.map(
      (track) =>
        new Promise<void>((resolve) => {
          if (track.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
            resolve();
            return;
          }
          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            window.clearTimeout(timeout);
            track.removeEventListener('canplaythrough', finish);
            track.removeEventListener('error', finish);
            resolve();
          };
          const timeout = window.setTimeout(finish, 10_000);
          track.addEventListener('canplaythrough', finish, { once: true });
          track.addEventListener('error', finish, { once: true });
          track.load();
        })
    )
  );
}
