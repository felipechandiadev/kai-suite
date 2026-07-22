import {
  isCameraSecureContext,
  mapCameraStartError,
  openBarcodeCameraStream,
  setTorchOnStream,
  stopMediaStream,
} from "./camera";
import { extractBarcodeVariants } from "./preprocess";
import {
  DEFAULT_BARCODE_FORMATS,
  type BarcodeScannerHandle,
  type CreateBarcodeScannerOptions,
} from "./types";

const OVERLAY_CLASS = "kai-barcode-scanner-overlay";

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

type DecodeBarcodeVariants = typeof import("./decode").decodeBarcodeVariants;

let decodeBarcodeVariantsFn: DecodeBarcodeVariants | null = null;

async function getDecodeBarcodeVariants(): Promise<DecodeBarcodeVariants> {
  if (!decodeBarcodeVariantsFn) {
    const mod = await import("./decode");
    decodeBarcodeVariantsFn = mod.decodeBarcodeVariants;
  }
  return decodeBarcodeVariantsFn;
}

function ensureOverlay(container: HTMLElement): HTMLElement {
  let overlay = container.querySelector<HTMLElement>(`.${OVERLAY_CLASS}`);
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = [
    "pointer-events:none",
    "position:absolute",
    "inset:0",
    "z-index:2",
    "display:flex",
    "align-items:center",
    "justify-content:center",
  ].join(";");
  const band = document.createElement("div");
  band.style.cssText = [
    "width:70%",
    "height:35%",
    "max-height:120px",
    "border:2px solid rgba(255,255,255,0.85)",
    "border-radius:8px",
    "box-shadow:0 0 0 9999px rgba(0,0,0,0.45)",
    "position:relative",
  ].join(";");
  const hint = document.createElement("div");
  hint.textContent = "Alineá el código dentro de la franja";
  hint.style.cssText = [
    "position:absolute",
    "left:50%",
    "bottom:calc(100% + 8px)",
    "transform:translateX(-50%)",
    "white-space:nowrap",
    "color:rgba(255,255,255,0.9)",
    "font:600 12px/1.2 system-ui,sans-serif",
    "text-shadow:0 1px 2px rgba(0,0,0,0.6)",
  ].join(";");
  band.appendChild(hint);
  overlay.appendChild(band);
  const stylePos = getComputedStyle(container).position;
  if (stylePos === "static" || !stylePos) {
    container.style.position = "relative";
  }
  container.appendChild(overlay);
  return overlay;
}

function ensureVideo(container: HTMLElement): HTMLVideoElement {
  let video = container.querySelector<HTMLVideoElement>("video[data-kai-barcode-video]");
  if (video) return video;
  video = document.createElement("video");
  video.setAttribute("data-kai-barcode-video", "1");
  video.setAttribute("playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  video.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;";
  const stylePos = getComputedStyle(container).position;
  if (stylePos === "static" || !stylePos) {
    container.style.position = "relative";
  }
  container.style.overflow = "hidden";
  container.appendChild(video);
  return video;
}

export function createBarcodeScanner(
  options: CreateBarcodeScannerOptions,
): BarcodeScannerHandle {
  const formats = options.formats?.length
    ? options.formats
    : DEFAULT_BARCODE_FORMATS;
  const debounceMs = options.debounceMs ?? 1500;
  const fps = Math.max(4, Math.min(15, options.fps ?? 10));
  const frameIntervalMs = 1000 / fps;

  let stream: MediaStream | null = null;
  let video: VideoWithFrameCallback | null = null;
  let workCanvas: HTMLCanvasElement | null = null;
  let rafId = 0;
  let lastFrameAt = 0;
  let lastScan: { code: string; at: number } | null = null;
  let paused = false;
  let running = false;
  let decoding = false;
  let startGen = 0;
  let usingRvfc = false;

  const emitScan = (code: string) => {
    const now = Date.now();
    if (lastScan && lastScan.code === code && now - lastScan.at < debounceMs) {
      return;
    }
    lastScan = { code, at: now };
    options.onScan(code);
  };

  const cancelTick = () => {
    if (!rafId) return;
    if (usingRvfc && video?.cancelVideoFrameCallback) {
      try {
        video.cancelVideoFrameCallback(rafId);
      } catch {
        cancelAnimationFrame(rafId);
      }
    } else {
      cancelAnimationFrame(rafId);
    }
    rafId = 0;
  };

  const releaseMedia = () => {
    cancelTick();
    decoding = false;
    if (video) {
      try {
        video.pause();
        video.srcObject = null;
      } catch {
        // ignore
      }
    }
    stopMediaStream(stream);
    stream = null;
  };

  const tick = async (now: number) => {
    if (!running || paused || !video) return;

    if (usingRvfc && video.requestVideoFrameCallback) {
      rafId = video.requestVideoFrameCallback((t) => {
        void tick(t);
      });
    } else {
      rafId = requestAnimationFrame((t) => {
        void tick(t);
      });
    }

    if (decoding) return;
    if (now - lastFrameAt < frameIntervalMs) return;
    if (!video.videoWidth || video.readyState < 2) return;

    lastFrameAt = now;
    decoding = true;
    try {
      if (!workCanvas) workCanvas = document.createElement("canvas");
      const variants = extractBarcodeVariants(video, workCanvas);
      if (variants.length) {
        const decodeBarcodeVariants = await getDecodeBarcodeVariants();
        const code = await decodeBarcodeVariants(variants, formats);
        if (code && running && !paused) emitScan(code);
      }
    } catch {
      // ignore frame errors
    } finally {
      decoding = false;
    }
  };

  const scheduleTick = () => {
    if (!video || !running || paused) return;
    cancelTick();
    usingRvfc = typeof video.requestVideoFrameCallback === "function";
    if (usingRvfc && video.requestVideoFrameCallback) {
      rafId = video.requestVideoFrameCallback((t) => {
        void tick(t);
      });
    } else {
      rafId = requestAnimationFrame((t) => {
        void tick(t);
      });
    }
  };

  return {
    async start(container: HTMLElement) {
      releaseMedia();
      const gen = ++startGen;
      running = false;
      paused = false;

      if (!isCameraSecureContext()) {
        const msg = mapCameraStartError(
          new Error("INSECURE_CONTEXT"),
          options.appHint,
        );
        options.onError?.(msg);
        throw new Error(msg);
      }

      try {
        stream = await openBarcodeCameraStream();
        if (gen !== startGen) {
          stopMediaStream(stream);
          stream = null;
          return;
        }
        video = ensureVideo(container);
        ensureOverlay(container);
        video.srcObject = stream;
        await video.play();
        if (gen !== startGen) {
          releaseMedia();
          return;
        }
        running = true;
        paused = false;
        lastFrameAt = 0;
        scheduleTick();
      } catch (e) {
        releaseMedia();
        if (gen !== startGen) return;
        const msg = mapCameraStartError(e, options.appHint);
        options.onError?.(msg);
        throw new Error(msg);
      }
    },

    async stop() {
      startGen += 1;
      running = false;
      paused = false;
      releaseMedia();
    },

    pause() {
      paused = true;
      cancelTick();
    },

    resume() {
      if (!running) return;
      paused = false;
      lastFrameAt = 0;
      scheduleTick();
    },

    async setTorch(on: boolean) {
      await setTorchOnStream(stream, on);
    },
  };
}
