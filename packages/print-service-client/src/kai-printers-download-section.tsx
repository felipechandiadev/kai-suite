"use client";

import { useEffect, useState } from "react";
import {
  fetchKaiPrintersDownloadsManifests,
  listKaiPrintersDownloadOffers,
  type KaiPrintersDownloadsManifests,
  type KaiPrintersPlatform,
} from "./kai-printers-downloads";

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

function PlatformIcon({
  platform,
  className = "h-5 w-5",
}: {
  platform: KaiPrintersPlatform;
  className?: string;
}) {
  if (platform === "android") {
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
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    );
  }
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
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

type KaiPrintersDownloadSectionProps = {
  /** Manifests leídos en SSR desde public/downloads. */
  initialManifests?: KaiPrintersDownloadsManifests;
  /** @deprecated Usar initialManifests.android */
  initialManifest?: KaiPrintersDownloadsManifests["android"];
};

export function KaiPrintersDownloadSection({
  initialManifests,
  initialManifest,
}: KaiPrintersDownloadSectionProps = {}) {
  const seedManifests: KaiPrintersDownloadsManifests = {
    ...initialManifests,
    android: initialManifests?.android ?? initialManifest,
  };

  const [manifests, setManifests] = useState<KaiPrintersDownloadsManifests | null>(
    Object.keys(seedManifests).length > 0 ? seedManifests : null,
  );

  useEffect(() => {
    void fetchKaiPrintersDownloadsManifests().then((fetched) => {
      setManifests(fetched);
    });
  }, []);

  const resolved = manifests ?? seedManifests;
  const offers = listKaiPrintersDownloadOffers(resolved);
  const available = offers.filter((o) => o.href);

  if (available.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-border bg-background p-4 shadow-sm"
      data-test-id="kai-printers-downloads"
    >
      <h2 className="text-sm font-semibold text-foreground">Descargar Kai Printers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Agente local de impresión para tickets y documentos. Podés instalarlo en este equipo (host{" "}
        <code className="text-foreground">127.0.0.1</code>) o en otro de la red (IP LAN de ese equipo).{" "}
        <a
          href="/downloads/INSTALACION_ANDROID.md"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Guía de instalación (Android)
        </a>
      </p>

      <ul className="mt-4 space-y-3">
        {available.map((offer) => (
          <li
            key={offer.platform}
            className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <PlatformIcon platform={offer.platform} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{offer.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{offer.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{offer.installHint}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <a
                href={offer.href!}
                download={offer.platform === "android" ? undefined : offer.filename}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                data-test-id={`kai-printers-download-${offer.platform}`}
              >
                <DownloadIcon />
                {offer.version ? `Descargar v${offer.version}` : "Descargar"}
              </a>
              {offer.platform === "android" ? (
                <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-right">
                  Si Chrome no descarga, abrí{" "}
                  <a
                    href={offer.href!}
                    className="break-all text-primary underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {offer.href}
                  </a>{" "}
                  en una pestaña nueva.
                </p>
              ) : (
                <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-right">
                  {offer.filename}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
