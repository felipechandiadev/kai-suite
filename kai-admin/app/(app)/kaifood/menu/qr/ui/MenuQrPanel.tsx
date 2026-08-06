"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Alert, Button, TextField } from "@kai/ui";
import { Copy, Download } from "lucide-react";

type Props = {
  menuPublicSlug: string | null;
};

function resolveMenuPublicUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_KAI_MENU_URL || "").trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function MenuQrPanel({ menuPublicSlug }: Props) {
  const menuUrl = useMemo(() => resolveMenuPublicUrl(), []);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!menuUrl) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(menuUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDataUrl(null);
          setError(e instanceof Error ? e.message : "No se pudo generar el QR");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [menuUrl]);

  const onDownload = useCallback(() => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `kai-menu-qr${menuPublicSlug ? `-${menuPublicSlug}` : ""}.png`;
    a.click();
  }, [dataUrl, menuPublicSlug]);

  const onCopy = useCallback(async () => {
    if (!menuUrl) return;
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [menuUrl]);

  if (!menuUrl) {
    return (
      <Alert variant="warning" data-test-id="menu-qr-missing-url">
        Configure <code className="text-xs">NEXT_PUBLIC_KAI_MENU_URL</code> en el admin
        (p. ej. <code className="text-xs">http://localhost:5370</code>) para generar el QR
        de la carta.
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6" data-test-id="menu-qr-panel">
      <div className="space-y-2">
        <TextField
          label="URL pública de la carta"
          value={menuUrl}
          onChange={() => {}}
          readOnly
          alwaysShowLabel
          data-test-id="menu-qr-url"
        />
        {menuPublicSlug ? (
          <p className="text-sm text-muted-foreground">
            Slug configurado: <span className="font-mono">{menuPublicSlug}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin <span className="font-mono">menuPublicSlug</span> en la empresa activa.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outlined" size="sm" onClick={() => void onCopy()}>
            <Copy className="mr-1.5 h-4 w-4" />
            {copied ? "Copiado" : "Copiar URL"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onDownload}
            disabled={!dataUrl}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Descargar PNG
          </Button>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex justify-center rounded-xl border border-border bg-card p-6">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`Código QR de ${menuUrl}`}
            className="h-64 w-64"
            data-test-id="menu-qr-image"
          />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center text-sm text-muted-foreground">
            Generando QR…
          </div>
        )}
      </div>
    </div>
  );
}
