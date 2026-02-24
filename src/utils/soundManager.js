export const playSound = (
  soundFileName,
  baseVolume = 0.5,
  maxDurationMs = 2500,
) => {
  try {
    const audio = new Audio(`/sounds/${soundFileName}`);
    audio.volume = baseVolume;
    audio
      .play()
      .catch((err) => console.log("Son bloqué par le navigateur :", err));

    if (maxDurationMs) {
      setTimeout(() => {
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.05);
          } else {
            audio.pause();
            audio.currentTime = 0;
            clearInterval(fadeInterval);
          }
        }, 50);
      }, maxDurationMs - 500);
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du son :", error);
  }
};

export const playCrossfadeLoop = (
  soundFileName,
  targetVolume = 0.3,
  fadeTimeMs = 2000,
) => {
  let isPlaying = true;
  let activeFadeInterval = null;

  const audio1 = new Audio(`/sounds/${soundFileName}`);
  const audio2 = new Audio(`/sounds/${soundFileName}`);

  const setupLoop = (currentTrack, nextTrack) => {
    if (!isPlaying) return;

    currentTrack.volume = targetVolume;
    currentTrack.play().catch((err) => console.log("Son bloqué :", err));

    const fadeTriggerTime = fadeTimeMs / 1000;

    const onTimeUpdate = () => {
      if (
        currentTrack.duration &&
        currentTrack.currentTime >= currentTrack.duration - fadeTriggerTime
      ) {
        currentTrack.removeEventListener("timeupdate", onTimeUpdate);

        nextTrack.volume = 0;
        nextTrack.currentTime = 0;
        nextTrack.play().catch((err) => console.log(err));

        const steps = 20;
        const stepTime = fadeTimeMs / steps;
        let step = 0;

        activeFadeInterval = setInterval(() => {
          if (!isPlaying) {
            clearInterval(activeFadeInterval);
            return;
          }
          step++;
          const ratio = step / steps;

          currentTrack.volume = Math.max(0, targetVolume * (1 - ratio));
          nextTrack.volume = Math.min(targetVolume, targetVolume * ratio);

          if (step >= steps) {
            clearInterval(activeFadeInterval);
            currentTrack.pause();
            setupLoop(nextTrack, currentTrack);
          }
        }, stepTime);
      }
    };

    currentTrack.addEventListener("timeupdate", onTimeUpdate);
  };

  setupLoop(audio1, audio2);

  return {
    stop: () => {
      isPlaying = false;
      if (activeFadeInterval) clearInterval(activeFadeInterval);
      audio1.pause();
      audio2.pause();
    },
  };
};
