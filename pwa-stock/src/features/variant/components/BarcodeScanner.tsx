"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert, Button } from "@kai/ui";
import {
  getCameraStartConfigs,
  isCameraSecureContext,
  isRetryableCameraError,
  mapCameraStartError,
  prefersCameraUserGesture,
} from "../lib/barcode-scanner-camera";

type BarcodeScannerProps = {
  onScan: (code: string) => void;
  paused?: boolean;
};

function isScannerStopError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /not running|not paused/i.test(msg);
}

export default function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const runningRef = useRef(false);
  const startGenRef = useRef(0);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
        console.warn("[BarcodeScanner] stop:", e);
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
      const scanConfig = { fps: 10, qrbox: { width: 260, height: 160 } };

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
              console.warn("[BarcodeScanner] stop after failed start:", stopErr);
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
            console.warn("[BarcodeScanner] stop after stale start:", e);
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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || paused) {
      startGenRef.current += 1;
      void stopScanner();
      return;
    }
    if (!prefersCameraUserGesture() && isCameraSecureContext()) {
      void startScanner();
    }
    return () => {
      startGenRef.current += 1;
      void stopScanner();
    };
  }, [mounted, paused, startScanner, stopScanner]);

  const showActivate = !cameraActive && !starting;

  const hintText = !mounted
    ? "Toca para activar la cámara."
    : !isCameraSecureContext()
      ? "Safari bloquea la cámara en URLs por IP. Usa localhost:3033 en el simulador o HTTPS en el iPhone."
      : prefersCameraUserGesture()
        ? "En iPhone/Safari debes tocar el botón para que el navegador pida permiso de cámara."
        : null;

  return (
    <div className="w-full">
      {cameraError ? (
        <Alert variant="warning" className="mb-3">
          {cameraError}
        </Alert>
      ) : null}

      {showActivate ? (
        <div className="mb-3 flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            loading={starting}
            disabled={starting || paused}
            onClick={() => void startScanner()}
            data-test-id="barcode-scanner-activate"
          >
            Activar cámara
          </Button>
          {hintText ? (
            <p className="text-center text-xs text-muted-foreground">{hintText}</p>
          ) : null}
        </div>
      ) : null}

      <div
        id={regionId}
        className={`mx-auto min-h-[220px] w-full overflow-hidden rounded-lg border border-border bg-neutral ${
          cameraActive || starting ? "" : "hidden"
        }`}
        data-test-id="barcode-scanner-region"
      />
    </div>
  );
}
