"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button } from "@kai/ui";
import {
  createBarcodeScanner,
  isCameraSecureContext,
  prefersCameraUserGesture,
  type BarcodeScannerHandle,
} from "@kai/barcode-scanner";

type BarcodeScannerProps = {
  onScan: (code: string) => void;
  paused?: boolean;
};

const APP_HINT = "http://localhost:5063";

export default function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<BarcodeScannerHandle | null>(null);
  const startGenRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      await s.stop();
    } catch (e) {
      console.warn("[BarcodeScanner] stop:", e);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (paused) return;
    const gen = ++startGenRef.current;
    setCameraError(null);
    setStarting(true);

    await stopScanner();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const container = containerRef.current;
    if (!container || gen !== startGenRef.current) {
      if (gen === startGenRef.current) setStarting(false);
      return;
    }

    try {
      if (!isCameraSecureContext()) {
        throw new Error("INSECURE_CONTEXT");
      }

      const scanner = createBarcodeScanner({
        appHint: APP_HINT,
        onScan: (code) => onScanRef.current(code),
        onError: (message) => {
          if (gen === startGenRef.current) setCameraError(message);
        },
      });

      await scanner.start(container);

      if (gen !== startGenRef.current) {
        await scanner.stop();
        return;
      }

      scannerRef.current = scanner;
      setCameraActive(true);
    } catch (e) {
      if (gen === startGenRef.current) {
        const msg =
          e instanceof Error && e.message
            ? e.message
            : "No se pudo acceder a la cámara.";
        setCameraError(msg);
        setCameraActive(false);
      }
    } finally {
      if (gen === startGenRef.current) {
        setStarting(false);
      }
    }
  }, [paused, stopScanner]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || paused) {
      startGenRef.current += 1;
      void stopScanner();
      setCameraActive(false);
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
      ? "Safari bloquea la cámara en URLs por IP. Usa localhost:5063 en el simulador o HTTPS en el iPhone."
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
        ref={containerRef}
        className={`relative mx-auto min-h-55 w-full overflow-hidden rounded-lg border border-border bg-neutral ${
          cameraActive || starting ? "" : "hidden"
        }`}
        data-test-id="barcode-scanner-region"
      />
    </div>
  );
}
