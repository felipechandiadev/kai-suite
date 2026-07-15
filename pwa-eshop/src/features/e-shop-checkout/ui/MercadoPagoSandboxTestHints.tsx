"use client";

import { useCallback, useState } from "react";
import { Button } from "@kai/ui";

type CopyRowProps = {
  label: string;
  value: string;
  hint?: string;
};

function CopyRow({ label, value, hint }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [value]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-mono text-sm break-all">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Button type="button" variant="outlined" className="shrink-0" onClick={() => void onCopy()}>
        {copied ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}

const QUICK = {
  number: "4168818844447115",
  display: "4168 8188 4444 7115",
  cvv: "123",
  exp: "11/30",
  holder: "APRO",
  doc: "123456789",
} as const;

type Props = {
  environment?: string | null;
};

/** Ayuda mínima de prueba Chile (sandbox). Solo flujo aprobado. */
export function MercadoPagoSandboxTestHints({ environment }: Props) {
  const isSandbox =
    process.env.NODE_ENV === "development" ||
    (environment ?? "").toLowerCase() === "sandbox";

  if (!isSandbox) return null;

  return (
    <details
      open
      className="rounded-lg border border-amber-300/80 bg-amber-50/80 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        Pago rápido recomendado (sandbox)
      </summary>
      <div className="space-y-2 border-t border-amber-200/80 px-4 py-4 dark:border-amber-800/60">
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
          Visa · titular <strong>APRO</strong> · documento tipo “otro”{" "}
          <strong>{QUICK.doc}</strong>. En sandbox el pago usa{" "}
          <strong>test@testuser.com</strong> automáticamente.
        </p>
        <CopyRow label="Número Visa" value={QUICK.number} hint={QUICK.display} />
        <CopyRow label="CVV" value={QUICK.cvv} />
        <CopyRow label="Vencimiento" value={QUICK.exp} />
        <CopyRow label="Titular (aprobado)" value={QUICK.holder} />
        <CopyRow label="Documento (otro)" value={QUICK.doc} />
        <CopyRow
          label="Email pagador (sandbox MP)"
          value="test@testuser.com"
          hint="Lo aplica el backend; tu email real se guarda en el pedido"
        />
      </div>
    </details>
  );
}
