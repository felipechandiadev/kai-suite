"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@kai/ui";
import {
  createBarcodeScanner,
  isCameraSecureContext,
  type BarcodeScannerHandle,
} from "@kai/barcode-scanner";

type PosBarcodeScannerProps = {
  onScan: (code: string) => void;
  paused?: boolean;
};

const APP_HINT = "http://localhost:5062";

export default function PosBarcodeScanner({ onScan, paused = false }: PosBarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<BarcodeScannerHandle | null>(null);
  const startGenRef = useRef(0);
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
    if (!s) return;
    try {
      await s.stop();
    } catch (e) {
      console.warn("[PosBarcodeScanner] stop:", e);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (paused) return;
    const gen = ++startGenRef.current;
    setCameraError(null);
    setStarting(true);

    await stopScanner();
    // Allow React to unhide the region before attaching the video.
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
    if (!mounted || paused) {
      startGenRef.current += 1;
      void stopScanner();
      setCameraActive(false);
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

      <div className="pos-barcode-scanner-view relative w-full">
        <div
          ref={containerRef}
          className={`relative mx-auto aspect-5/2 w-full max-h-35 overflow-hidden rounded-lg border border-border bg-neutral ${
            cameraActive || starting ? "" : "hidden"
          }`}
          data-test-id="pos-barcode-scanner-region"
        />
      </div>
    </div>
  );
}
