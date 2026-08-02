"use client";

import { Button, TextField } from "@kai/ui";

type Props = {
  suggestPercent: number;
  suggestedAmount: number;
  tipAmount: number;
  tipStatus: "ACCEPTED" | "CUSTOM" | "DECLINED" | "NONE";
  allowCustomAmount: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCustom: (amount: number) => void;
};

function fmtClp(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PosDiningTipCapture({
  suggestPercent,
  suggestedAmount,
  tipAmount,
  tipStatus,
  allowCustomAmount,
  onAccept,
  onDecline,
  onCustom,
}: Props) {
  return (
    <div
      className="rounded-lg border border-border bg-muted/20 p-3"
      data-test-id="pos-dining-tip-capture"
    >
      <p className="text-sm font-medium text-foreground">Propina sugerida</p>
      <p className="text-xs text-muted-foreground">
        {suggestPercent}% · {fmtClp(suggestedAmount)} (no forma parte de la boleta)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tipStatus === "ACCEPTED" ? "primary" : "outlined"}
          onClick={onAccept}
          data-test-id="pos-tip-accept"
        >
          Aceptar
        </Button>
        {allowCustomAmount ? (
          <Button
            size="sm"
            variant={tipStatus === "CUSTOM" ? "primary" : "outlined"}
            onClick={() => {
              const raw = window.prompt(
                "Monto de propina",
                String(Math.round(tipAmount || suggestedAmount)),
              );
              if (raw == null) return;
              const n = Math.max(0, Math.round(Number(raw) || 0));
              onCustom(n);
            }}
            data-test-id="pos-tip-custom"
          >
            Modificar
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={tipStatus === "DECLINED" ? "primary" : "outlined"}
          onClick={onDecline}
          data-test-id="pos-tip-decline"
        >
          Sin propina
        </Button>
      </div>
      <p className="mt-2 text-sm tabular-nums text-foreground">
        Propina: {fmtClp(tipAmount)}
        {tipStatus === "DECLINED" ? " (rechazada)" : ""}
      </p>
    </div>
  );
}
