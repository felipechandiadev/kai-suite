"use client";

import Link from "next/link";
import { Badge, IconButton } from "@kai/ui";
import type { SignalCard as SignalCardData, SignalSeverity } from "../types/signal.types";

const severityBadge: Record<
  SignalSeverity,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  OK: { label: "En rango", variant: "success" },
  WATCH: { label: "Vigilar", variant: "warning" },
  CRITICAL: { label: "Atender", variant: "error" },
  INFO: { label: "Info", variant: "info" },
};

const severityBorder: Record<SignalSeverity, string> = {
  OK: "border-border",
  WATCH: "border-warning/40",
  CRITICAL: "border-error/50",
  INFO: "border-border",
};

type Props = {
  signal: SignalCardData;
  onOpenEvidence?: (signalId: string) => void;
};

function subjectLabel(name: string, attributes?: string | null): string {
  const n = name.trim();
  const a = (attributes ?? "").trim();
  if (!n) return a || "Producto";
  return a ? `${n} · ${a}` : n;
}

export function SignalCard({ signal, onOpenEvidence }: Props) {
  const badge = severityBadge[signal.severity];
  const subject = signal.subject;
  const productLine = subject
    ? subjectLabel(subject.name, subject.attributes)
    : null;
  const unavailable = signal.insight === "No disponible ahora";
  const aria = `Señal ${signal.title}, severidad ${badge.label}: ${
    productLine ? `${productLine}. ${signal.headline}` : signal.headline
  }`;

  return (
    <article
      className={`group flex h-full flex-col rounded-xl border bg-background p-5 transition-colors duration-200 hover:bg-muted/30 ${severityBorder[signal.severity]}`}
      aria-label={aria}
      data-test-id={`signal-card-${signal.id}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{signal.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {onOpenEvidence ? (
            <IconButton
              icon="MoreHorizontal"
              variant="action"
              size="sm"
              disabled={unavailable}
              ariaLabel="Ver fundamento de la señal"
              title="Ver fundamento"
              onClick={() => onOpenEvidence(signal.id)}
              data-test-id={`signal-evidence-open-${signal.id}`}
            />
          ) : null}
        </div>
      </div>

      {subject ? (
        <div className="mb-2 space-y-0.5">
          <p className="text-lg font-semibold leading-snug tracking-tight text-foreground md:text-xl">
            {productLine}
          </p>
          {subject.sku ? (
            <p className="text-xs text-muted-foreground">{subject.sku}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem]">
        {signal.headline}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{signal.context}</p>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">{signal.insight}</p>

      {signal.cta ? (
        <div className="mt-5 pt-1">
          <Link
            href={signal.cta.href}
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-all duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group-hover:translate-x-0.5"
            data-test-id={`signal-cta-${signal.id}`}
          >
            {signal.cta.label}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
