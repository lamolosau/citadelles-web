// ==========================================
// UTILITAIRE : Gestionnaire de Sons avec Auto-Fade
// ==========================================

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

    // ⚡ FILET DE SÉCURITÉ : On coupe le son en douceur à la fin de l'animation
    if (maxDurationMs) {
      setTimeout(() => {
        // Petit "Fade Out" maison sur 500ms
        const fadeInterval = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.05); // Baisse de 5% par étape
          } else {
            audio.pause();
            audio.currentTime = 0;
            clearInterval(fadeInterval);
          }
        }, 50); // Toutes les 50ms
      }, maxDurationMs - 500); // Commence à baisser le son 500ms avant la fin
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du son :", error);
  }
};

// ==========================================
// UTILITAIRE : Boucle Audio avec Fondu Enchaîné (Crossfade)
// ==========================================

export const playCrossfadeLoop = (
  soundFileName,
  targetVolume = 0.3,
  fadeTimeMs = 2000,
) => {
  let isPlaying = true;

  // On crée deux lecteurs (comme deux platines DJ)
  const audio1 = new Audio(`/sounds/${soundFileName}`);
  const audio2 = new Audio(`/sounds/${soundFileName}`);

  const setupLoop = (currentTrack, nextTrack) => {
    if (!isPlaying) return;

    currentTrack.volume = targetVolume;
    currentTrack.play().catch((err) => console.log("Son bloqué :", err));

    const fadeTriggerTime = fadeTimeMs / 1000; // Converti en secondes

    const onTimeUpdate = () => {
      // Si on arrive dans les X dernières secondes de la musique...
      if (
        currentTrack.duration &&
        currentTrack.currentTime >= currentTrack.duration - fadeTriggerTime
      ) {
        currentTrack.removeEventListener("timeupdate", onTimeUpdate); // On arrête d'écouter

        // 1. On lance la deuxième piste à volume 0
        nextTrack.volume = 0;
        nextTrack.currentTime = 0;
        nextTrack.play().catch((err) => console.log(err));

        // 2. On croise les volumes progressivement
        const steps = 20;
        const stepTime = fadeTimeMs / steps;
        let step = 0;

        const fadeInterval = setInterval(() => {
          if (!isPlaying) {
            clearInterval(fadeInterval);
            return;
          }
          step++;
          const ratio = step / steps;

          // La piste actuelle baisse, la nouvelle monte
          currentTrack.volume = Math.max(0, targetVolume * (1 - ratio));
          nextTrack.volume = Math.min(targetVolume, targetVolume * ratio);

          if (step >= steps) {
            clearInterval(fadeInterval);
            currentTrack.pause();
            // Et on relance la logique en inversant les platines !
            setupLoop(nextTrack, currentTrack);
          }
        }, stepTime);
      }
    };

    currentTrack.addEventListener("timeupdate", onTimeUpdate);
  };

  // On lance la machine
  setupLoop(audio1, audio2);

  // On retourne une fonction pour pouvoir tout couper d'un coup
  return {
    stop: () => {
      isPlaying = false;
      audio1.pause();
      audio2.pause();
    },
  };
};
