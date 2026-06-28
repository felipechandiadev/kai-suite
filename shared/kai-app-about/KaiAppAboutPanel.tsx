"use client";

import { useEffect, useState } from "react";

export type KaiAppAboutPanelProps = {
  appName: string;
  productLabel?: string;
  /** Versión del agente Kai Printers si está conectado */
  printAgentVersion?: string | null;
  printAgentConnected?: boolean;
};

type HealthPayload = {
  version?: string;
  status?: string;
};

export function KaiAppAboutPanel({
  appName,
  productLabel = "KaiStore",
  printAgentVersion,
  printAgentConnected,
}: KaiAppAboutPanelProps) {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "—";
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
  const [backendVersion, setBackendVersion] = useState<string | null>(null);
  const [backendError, setBackendError] = useState(false);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "") ?? "";
    if (!base) return;
    fetch(`${base}/health`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("health"))))
      .then((data: HealthPayload) => setBackendVersion(data.version ?? null))
      .catch(() => setBackendError(true));
  }, []);

  return (
    <div className="space-y-4 text-sm" data-test-id="kai-app-about-panel">
      <div>
        <p className="text-lg font-semibold">Kai — {productLabel}</p>
        <p className="text-muted-foreground">{appName}</p>
      </div>
      <dl className="grid gap-2 sm:grid-cols-[minmax(8rem,auto)_1fr]">
        <dt className="font-medium text-muted-foreground">Versión app</dt>
        <dd>{appVersion}</dd>
        {buildId ? (
          <>
            <dt className="font-medium text-muted-foreground">Build</dt>
            <dd className="font-mono text-xs">{buildId}</dd>
          </>
        ) : null}
        <dt className="font-medium text-muted-foreground">Backend</dt>
        <dd>
          {backendVersion ?? (backendError ? "No disponible" : "…")}
        </dd>
        <dt className="font-medium text-muted-foreground">Kai Printers</dt>
        <dd>
          {printAgentConnected
            ? printAgentVersion
              ? `Conectado · v${printAgentVersion}`
              : "Conectado"
            : "No conectado"}
        </dd>
      </dl>
      <p className="text-xs text-muted-foreground">© Kai Platform</p>
    </div>
  );
}
