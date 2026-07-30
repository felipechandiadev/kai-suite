/**
 * Sonido de alerta POS — MP3 en `/public/sounds/pos-alert.mp3`
 * (ex ding de cocina). Requiere gesto previo por autoplay.
 */

const POS_ALERT_SOUND_URL = "/sounds/pos-alert.mp3";

let sharedCtx: AudioContext | null = null;
let alertAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!alertAudio) {
    alertAudio = new Audio(POS_ALERT_SOUND_URL);
    alertAudio.preload = "auto";
  }
  return alertAudio;
}

/** Desbloquea audio tras un gesto del usuario (políticas del navegador). */
export function unlockPosAlertAudio(): void {
  const ctx = getAudioContext();
  getAlertAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/**
 * Alerta audible (stock, precios, cocina lista, etc.).
 * Seguro llamar muchas veces; fallos de audio se ignoran.
 */
export function playPosAlertSound(): void {
  try {
    const audio = getAlertAudio();
    if (!audio) return;
    const ctx = getAudioContext();
    const run = () => {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    };
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().then(run).catch(() => {});
    } else {
      run();
    }
  } catch {
    // ignore
  }
}
