/**
 * Sonido de alerta KDS — MP3 en `/public/sounds/kds-new-order.mp3`
 * (notificación nueva). Requiere gesto de usuario (top bar) por autoplay.
 */

const KDS_ALERT_SOUND_URL = "/sounds/kds-new-order.mp3";

let sharedCtx: AudioContext | null = null;
let alertAudio: HTMLAudioElement | null = null;
let htmlAudioUnlocked = false;
const stateListeners = new Set<(running: boolean) => void>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
    sharedCtx.addEventListener("statechange", notifyAudioStateListeners);
  }
  return sharedCtx;
}

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!alertAudio) {
    alertAudio = new Audio(KDS_ALERT_SOUND_URL);
    alertAudio.preload = "auto";
  }
  return alertAudio;
}

function notifyAudioStateListeners(): void {
  const running = isKdsAlertAudioRunning();
  for (const listener of stateListeners) {
    try {
      listener(running);
    } catch {
      // ignore
    }
  }
}

/** true si el audio está desbloqueado y puede sonar en alertas. */
export function isKdsAlertAudioRunning(): boolean {
  if (typeof window === "undefined") return false;
  if (htmlAudioUnlocked) return true;
  const ctx = sharedCtx;
  return Boolean(ctx && ctx.state === "running");
}

/**
 * Suscribe al estado running/suspended del audio KDS.
 * Devuelve unsubscribe. Emite el estado actual de inmediato.
 */
export function subscribeKdsAlertAudioState(
  listener: (running: boolean) => void,
): () => void {
  stateListeners.add(listener);
  getAudioContext();
  getAlertAudio();
  listener(isKdsAlertAudioRunning());
  return () => {
    stateListeners.delete(listener);
  };
}

/** Desbloquea audio tras un gesto del usuario (políticas del navegador). */
export function unlockKdsAlertAudio(): void {
  const ctx = getAudioContext();
  getAlertAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => notifyAudioStateListeners()).catch(() => {});
  } else {
    notifyAudioStateListeners();
  }
}

/**
 * Desbloquea audio y reproduce el ding de prueba (gesto de usuario en top bar).
 */
export async function unlockAndTestKdsAlertAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  const audio = getAlertAudio();
  if (!audio) return false;
  try {
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }
    audio.currentTime = 0;
    await audio.play();
    htmlAudioUnlocked = true;
    notifyAudioStateListeners();
    return true;
  } catch {
    notifyAudioStateListeners();
    return false;
  }
}

/**
 * Alerta audible para ítem nuevo en cola.
 * Seguro llamar muchas veces; fallos de audio se ignoran.
 */
export function playKdsAlertSound(): void {
  try {
    const audio = getAlertAudio();
    if (!audio) return;
    const ctx = getAudioContext();
    const run = () => {
      audio.currentTime = 0;
      void audio
        .play()
        .then(() => {
          htmlAudioUnlocked = true;
          notifyAudioStateListeners();
        })
        .catch(() => notifyAudioStateListeners());
    };
    if (ctx && ctx.state === "suspended") {
      void ctx
        .resume()
        .then(run)
        .catch(() => notifyAudioStateListeners());
    } else {
      run();
    }
  } catch {
    // ignore
  }
}
