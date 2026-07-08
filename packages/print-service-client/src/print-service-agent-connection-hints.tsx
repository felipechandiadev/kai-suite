"use client";

import {
  printServicePageRequiresTls,
  resolvePrintAgentConnectionUrls,
} from "./core";

type Props = {
  host: string;
  port: number | string;
  wssPort: number | string;
  useTls: boolean;
  className?: string;
  "data-test-id"?: string;
};

/**
 * Muestra URL WebSocket activa y enlace HTTPS para confiar el certificado del agente local.
 */
export function PrintServiceAgentConnectionHints({
  host,
  port,
  wssPort,
  useTls,
  className = "",
  "data-test-id": dataTestId = "print-agent-connection-hints",
}: Props) {
  const { wsUrl, usesTls, trustCertificateUrl } = resolvePrintAgentConnectionUrls({
    host,
    port,
    wssPort,
    useTls,
  });
  const pageHttps = printServicePageRequiresTls();

  return (
    <div className={`space-y-2 ${className}`.trim()} data-test-id={dataTestId}>
      <p className="text-sm text-muted-foreground">
        URL de conexión:{" "}
        <code className="break-all text-foreground">{wsUrl}</code>
      </p>
      {usesTls && trustCertificateUrl ? (
        <div
          className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
          data-test-id={`${dataTestId}-trust-cert`}
        >
          <p className="text-sm text-muted-foreground">
            {pageHttps
              ? "Esta app usa HTTPS: el navegador exige WSS al agente. Antes de imprimir, abrí una vez esta URL y aceptá el certificado local del agente"
              : "Con WSS activo, abrí una vez esta URL en este navegador y aceptá el certificado antes de imprimir"}
            {" "}
            (<code className="text-foreground">{host.trim() || "127.0.0.1"}</code>):
          </p>
          <p className="mt-2">
            <a
              href={trustCertificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-primary underline underline-offset-2 hover:opacity-90"
              data-test-id={`${dataTestId}-trust-cert-link`}
            >
              {trustCertificateUrl}
            </a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tras aceptar el aviso de seguridad, volvé a esta pantalla y probá la impresión o reconectá
            desde el icono de impresión en la barra superior.
          </p>
        </div>
      ) : null}
    </div>
  );
}
