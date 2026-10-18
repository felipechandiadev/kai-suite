"use client";

import type { KaiScreenDownloadOffer } from "./kai-screen-downloads";

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

type KaiScreenDownloadSectionProps = {
  /** Resuelta en el servidor con `loadKaiScreenDownloadOffer()`. */
  offer?: KaiScreenDownloadOffer | null;
  className?: string;
};

export function KaiScreenDownloadSection({
  offer,
  className = "",
}: KaiScreenDownloadSectionProps) {
  if (!offer) return null;

  return (
    <div
      className={`rounded-lg border border-border bg-muted/20 p-4 ${className}`.trim()}
      data-test-id="kai-screen-download"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{offer.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{offer.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{offer.installHint}</p>
          <a
            href="/downloads/INSTALACION_KAI_SCREEN_ANDROID.md"
            className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Guía de instalación (Android)
          </a>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <a
            href={offer.href}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            data-test-id="kai-screen-download-android"
          >
            <DownloadIcon />
            {offer.version ? `Descargar v${offer.version}` : "Descargar"}
          </a>
          <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-right">
            Si Chrome no descarga, abrí{" "}
            <a
              href={offer.href}
              className="break-all text-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {offer.href}
            </a>{" "}
            en una pestaña nueva.
          </p>
        </div>
      </div>
    </div>
  );
}
