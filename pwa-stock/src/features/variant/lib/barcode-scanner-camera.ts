/** Config accepted by html5-qrcode `start()` — never pass a bare deviceId string (uses exact). */
export type CameraStartConfig =
  | { facingMode: "environment" | "user" }
  | { deviceId: string };

export function isCameraSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

/** Safari/iOS suele requerir gesto del usuario antes de getUserMedia. */
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

export function mapCameraStartError(error: unknown): string {
  if (!isCameraSecureContext()) {
    return "La cámara solo funciona con HTTPS o en localhost. Abre la app con https:// o http://localhost:5033 (no uses la IP de la red en Safari).";
  }
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const lower = msg.toLowerCase();
  if (isOverconstrainedError(error)) {
    return "No se pudo usar la cámara con la configuración del dispositivo. En el simulador: Features → Camera. En iPhone real, vuelve a tocar «Activar cámara».";
  }
  if (
    lower.includes("notallowed") ||
    lower.includes("permission") ||
    lower.includes("denied")
  ) {
    return "Permiso de cámara denegado. En iPhone: Ajustes → Safari → Cámara → Preguntar o Permitir, y vuelve a tocar «Activar cámara».";
  }
  if (lower.includes("notfound") || lower.includes("no camera")) {
    return "No se encontró cámara. En el simulador: menú Features → Camera y elige la cámara del Mac.";
  }
  if (lower.includes("notreadable") || lower.includes("in use")) {
    return "La cámara está en uso por otra app. Ciérrala e inténtalo de nuevo.";
  }
  if (msg.trim()) return msg;
  return "No se pudo acceder a la cámara. Revise permisos del navegador.";
}

/** Orden de intentos: restricciones permisivas primero en Safari/iOS. */
export async function getCameraStartConfigs(): Promise<CameraStartConfig[]> {
  const configs: CameraStartConfig[] = [];

  if (prefersCameraUserGesture()) {
    configs.push({ facingMode: "environment" }, { facingMode: "user" });
    return configs;
  }

  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length) {
      const back = cameras.find((c) =>
        /back|rear|environment|trasera|wide/i.test(c.label || ""),
      );
      const pick = back ?? cameras[0];
      if (pick?.id) {
        configs.push({ deviceId: pick.id });
      }
    }
  } catch {
    // enumerate can fail before permission — fall through to facingMode
  }

  configs.push({ facingMode: "environment" }, { facingMode: "user" });
  return [...new Map(configs.map((c) => [JSON.stringify(c), c])).values()];
}

export function isRetryableCameraError(error: unknown): boolean {
  return isOverconstrainedError(error);
}
