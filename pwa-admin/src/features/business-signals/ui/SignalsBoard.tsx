"use client";

import { useCallback, useState } from "react";
import type { SignalsBoard } from "../types/signal.types";
import { SignalCard } from "./SignalCard";
import { SignalEvidenceDialog } from "./SignalEvidenceDialog";

type Props = {
  board: SignalsBoard;
  branchId?: string;
};

function formatComputedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SignalsBoardView({ board, branchId }: Props) {
  const [evidenceId, setEvidenceId] = useState<string | null>(null);

  const openEvidence = useCallback((signalId: string) => {
    setEvidenceId(signalId);
  }, []);

  const attend = board.signals.filter(
    (s) => s.severity === "CRITICAL" || s.severity === "WATCH",
  );
  const calm = board.signals.filter(
    (s) => s.severity === "OK" || s.severity === "INFO",
  );

  return (
    <div className="space-y-10" data-test-id="signals-board">
      <header className="max-w-2xl space-y-2">
        <p className="text-base text-muted-foreground">Qué atender ahora</p>
        <p className="text-xs text-muted-foreground/80">
          Actualizado {formatComputedAt(board.computedAt)}
        </p>
      </header>

      {attend.length > 0 ? (
        <section aria-labelledby="signals-attend-heading" className="space-y-4">
          <h2
            id="signals-attend-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Atender ahora
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {attend.map((s) => (
              <SignalCard key={s.id} signal={s} onOpenEvidence={openEvidence} />
            ))}
          </div>
        </section>
      ) : null}

      {calm.length > 0 ? (
        <section aria-labelledby="signals-calm-heading" className="space-y-4">
          <h2
            id="signals-calm-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            En calma
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {calm.map((s) => (
              <SignalCard key={s.id} signal={s} onOpenEvidence={openEvidence} />
            ))}
          </div>
        </section>
      ) : null}

      {board.signals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay señales para mostrar.</p>
      ) : null}

      <SignalEvidenceDialog
        open={evidenceId != null}
        signalId={evidenceId}
        branchId={branchId}
        onClose={() => setEvidenceId(null)}
      />
    </div>
  );
}
