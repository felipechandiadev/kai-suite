/**
 * Sonido alerta mesero — asset en `/public/sounds/pos-alert.mp3`.
 */

const SOUND_URL = "/sounds/pos-alert.mp3";

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
    alertAudio = new Audio(SOUND_URL);
    alertAudio.preload = "auto";
  }
  return alertAudio;
}

export function unlockWaiterAlertAudio(): void {
  const ctx = getAudioContext();
  getAlertAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

export function playWaiterAlertSound(): void {
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
