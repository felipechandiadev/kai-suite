/**
 * Sonido de alerta KDS — Web Audio API (sin asset).
 * Timbre corto y agresivo para cocina (distinto al chime del POS).
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
export function unlockKdsAlertAudio(): void {
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
  const peak = opts.gain ?? 0.4;
  gain.gain.setValueAtTime(0.0001, opts.start);
  gain.gain.exponentialRampToValueAtTime(peak, opts.start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(opts.start);
  osc.stop(opts.start + opts.duration + 0.02);
}

/**
 * Alerta audible para ítem nuevo en cola (doble beep grave + agudo).
 * Seguro llamar muchas veces; fallos de audio se ignoran.
 */
export function playKdsAlertSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const run = () => {
      const t0 = ctx.currentTime + 0.01;
      tone(ctx, {
        frequency: 520,
        start: t0,
        duration: 0.12,
        gain: 0.45,
        type: "square",
      });
      tone(ctx, {
        frequency: 780,
        start: t0 + 0.14,
        duration: 0.16,
        gain: 0.5,
        type: "square",
      });
      tone(ctx, {
        frequency: 260,
        start: t0,
        duration: 0.28,
        gain: 0.3,
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
