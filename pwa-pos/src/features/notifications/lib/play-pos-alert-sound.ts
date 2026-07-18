/**
 * Sonido de alerta POS — Web Audio API (sin asset).
 * Patrón corto y fuerte para ambiente de salón/caja.
 */

let sharedCtx: AudioContext | null = null;

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

/** Desbloquea audio tras un gesto del usuario (políticas del navegador). */
export function unlockPosAlertAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

function tone(
  ctx: AudioContext,
  opts: {
    frequency: number;
    start: number;
    duration: number;
    gain?: number;
    type?: OscillatorType;
  },
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.frequency, opts.start);
  const peak = opts.gain ?? 0.35;
  gain.gain.setValueAtTime(0.0001, opts.start);
  gain.gain.exponentialRampToValueAtTime(peak, opts.start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(opts.start);
  osc.stop(opts.start + opts.duration + 0.02);
}

/**
 * Emite un chirrido/alerta muy perceptible (3 notas ascendentes + reforzador).
 * Seguro llamar muchas veces; fallos de audio se ignoran.
 */
export function playPosAlertSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const run = () => {
      const t0 = ctx.currentTime + 0.01;
      // Tres pitidos cortos ascendentes (muy audibles en caja)
      tone(ctx, { frequency: 880, start: t0, duration: 0.14, gain: 0.4 });
      tone(ctx, { frequency: 1175, start: t0 + 0.16, duration: 0.14, gain: 0.42 });
      tone(ctx, { frequency: 1480, start: t0 + 0.32, duration: 0.18, gain: 0.45 });
      // Refuerzo grave debajo del último (más “presencia”)
      tone(ctx, {
        frequency: 370,
        start: t0 + 0.32,
        duration: 0.22,
        gain: 0.28,
        type: "triangle",
      });
    };
    if (ctx.state === "suspended") {
      void ctx.resume().then(run).catch(() => {});
    } else {
      run();
    }
  } catch {
    // ignore
  }
}
