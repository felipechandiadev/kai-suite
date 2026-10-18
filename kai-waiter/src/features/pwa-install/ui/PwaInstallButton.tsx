"use client";

import { Download } from "lucide-react";
import { Button } from "@kai/ui";
import { usePwaInstall } from "@/features/pwa-install/hooks/usePwaInstall";

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const { canInstall, promptInstall } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <div className={className} data-test-id="pwa-install-root">
      <Button
        type="button"
        variant="outlined"
        className="w-full"
        onClick={() => void promptInstall()}
        data-test-id="pwa-install-button"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Download className="h-4 w-4" aria-hidden />
          Instalar app en este dispositivo
        </span>
      </Button>
    </div>
  );
}
