"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert } from "@kai/ui";
import {
  getCameraStartConfigs,
  isCameraSecureContext,
  isRetryableCameraError,
  mapCameraStartError,
} from "@/features/pos-products/lib/barcode-scanner-camera";

type PosBarcodeScannerProps = {
  onScan: (code: string) => void;
  paused?: boolean;
};

/** Sin `qrbox`: html5-qrcode no aplica el filtro oscuro y escanea todo el frame. */
function buildBarcodeScanConfig() {
  return {
    fps: 10,
  };
}

function isScannerStopError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /not running|not paused/i.test(msg);
}

export default function PosBarcodeScanner({ onScan, paused = false }: PosBarcodeScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const runningRef = useRef(false);
  const startGenRef = useRef(0);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mounted = typeof window !== "undefined";

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s || !runningRef.current) {
      runningRef.current = false;
      return;
    }
    runningRef.current = false;
    try {
      await s.stop();
    } catch (e) {
      if (!isScannerStopError(e)) {
        console.warn("[PosBarcodeScanner] stop:", e);
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (paused) return;

    const gen = ++startGenRef.current;
    setCameraError(null);
    setStarting(true);

    await stopScanner();

    try {
      if (!isCameraSecureContext()) {
        throw new Error("INSECURE_CONTEXT");
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(regionId);
      const cameraConfigs = await getCameraStartConfigs();
      const scanConfig = buildBarcodeScanConfig();

      const onDecode = (decoded: string) => {
        const code = decoded.trim();
        if (!code) return;
        const now = Date.now();
        const prev = lastScanRef.current;
        if (prev && prev.code === code && now - prev.at < 1500) return;
        lastScanRef.current = { code, at: now };
        onScanRef.current(code);
      };

      let lastError: unknown = null;
      let started = false;

      for (const cameraConfig of cameraConfigs) {
        if (gen !== startGenRef.current) break;
        try {
          await scanner.start(cameraConfig, scanConfig, onDecode, () => {});
          started = true;
          break;
        } catch (e) {
          lastError = e;
          if (!isRetryableCameraError(e)) break;
          try {
            await scanner.stop();
          } catch (stopErr) {
            if (!isScannerStopError(stopErr)) {
              console.warn("[PosBarcodeScanner] stop after failed start:", stopErr);
            }
          }
        }
      }

      if (!started) {
        throw lastError ?? new Error("No se pudo iniciar la cámara");
      }

      if (gen !== startGenRef.current) {
        try {
          await scanner.stop();
        } catch (e) {
          if (!isScannerStopError(e)) {
            console.warn("[PosBarcodeScanner] stop after stale start:", e);
          }
        }
        return;
      }

      scannerRef.current = scanner;
      runningRef.current = true;
      setCameraActive(true);
    } catch (e) {
      if (gen === startGenRef.current) {
        setCameraError(mapCameraStartError(e));
        setCameraActive(false);
      }
    } finally {
      if (gen === startGenRef.current) {
        setStarting(false);
      }
    }
  }, [paused, regionId, stopScanner]);

  useEffect(() => {
    if (!mounted || paused) {
      startGenRef.current += 1;
      void stopScanner();
      return;
    }
    if (isCameraSecureContext()) {
      const timer = window.setTimeout(() => {
        void startScanner();
      }, 0);
      return () => {
        window.clearTimeout(timer);
        startGenRef.current += 1;
        void stopScanner();
      };
    }
    return () => {
      startGenRef.current += 1;
      void stopScanner();
    };
  }, [mounted, paused, startScanner, stopScanner]);

  return (
    <div className="w-full shrink-0" data-test-id="pos-barcode-scanner">
      {cameraError ? (
        <Alert variant="warning" className="mb-2">
          {cameraError}
        </Alert>
      ) : null}

      <div className="pos-barcode-scanner-view relative w-full [&_#qr-shaded-region]:opacity-0">
        <div
          id={regionId}
          className={`mx-auto aspect-[5/2] w-full max-h-[140px] overflow-hidden rounded-lg border border-border bg-neutral ${
            cameraActive || starting ? "" : "hidden"
          }`}
          data-test-id="pos-barcode-scanner-region"
        />
      </div>
    </div>
  );
}
