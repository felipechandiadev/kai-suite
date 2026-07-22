export function isCameraSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

export function prefersCameraUserGesture(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);
  return isIOS || isSafari;
}

function isOverconstrainedError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const msg = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    name === "OverconstrainedError" ||
    msg.includes("overconstrained") ||
    msg.includes("invalid constraint")
  );
}

export function mapCameraStartError(
  error: unknown,
  appHint = "https:// o http://localhost",
): string {
  if (!isCameraSecureContext()) {
    return `La cámara solo funciona con HTTPS o en localhost. Abre la app con ${appHint} (no uses la IP de la red en Safari).`;
  }
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const lower = msg.toLowerCase();
  if (error instanceof Error && error.message === "INSECURE_CONTEXT") {
    return `La cámara solo funciona con HTTPS o en localhost. Abre la app con ${appHint}.`;
  }
  if (isOverconstrainedError(error)) {
    return "No se pudo usar la cámara con la configuración del dispositivo. Revisá permisos o probá otra cámara.";
  }
  if (
    lower.includes("notallowed") ||
    lower.includes("permission") ||
    lower.includes("denied")
  ) {
    return "Permiso de cámara denegado. Permití el acceso a la cámara en el navegador e intentá de nuevo.";
  }
  if (lower.includes("notfound") || lower.includes("no camera")) {
    return "No se encontró cámara en este dispositivo.";
  }
  if (lower.includes("notreadable") || lower.includes("in use")) {
    return "La cámara está en uso por otra app. Ciérrala e inténtalo de nuevo.";
  }
  if (msg.trim()) return msg;
  return "No se pudo acceder a la cámara. Revise permisos del navegador.";
}

type Facing = "environment" | "user";

async function tryGetUserMedia(
  facingMode: Facing,
): Promise<MediaStream> {
  const base: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(base);
    await tryApplyContinuousFocus(stream);
    return stream;
  } catch (e) {
    if (!isOverconstrainedError(e)) throw e;
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode },
    });
  }
}

async function tryApplyContinuousFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    const caps = track.getCapabilities?.() as
      | { focusMode?: string[] }
      | undefined;
    if (caps?.focusMode?.includes("continuous")) {
      await track.applyConstraints({
        // @ts-expect-error advanced focusMode not in all TS DOM libs
        advanced: [{ focusMode: "continuous" }],
      });
    }
  } catch {
    // ignore unsupported constraints
  }
}

/** Prefer back camera; fall back to user. */
export async function openBarcodeCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia no está disponible en este navegador.");
  }
  try {
    return await tryGetUserMedia("environment");
  } catch (e) {
    if (isOverconstrainedError(e) || (e instanceof Error && /notfound|notallowed/i.test(e.name))) {
      return tryGetUserMedia("user");
    }
    throw e;
  }
}

export async function setTorchOnStream(
  stream: MediaStream | null,
  on: boolean,
): Promise<boolean> {
  const track = stream?.getVideoTracks()[0];
  if (!track) return false;
  try {
    const caps = track.getCapabilities?.() as { torch?: boolean } | undefined;
    if (!caps?.torch) return false;
    await track.applyConstraints({
      // @ts-expect-error torch advanced constraint
      advanced: [{ torch: on }],
    });
    return true;
  } catch {
    return false;
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // ignore
    }
  }
}
