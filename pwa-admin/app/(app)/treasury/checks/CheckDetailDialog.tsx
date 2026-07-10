"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import Badge from "@kai/ui";
import { Alert } from "@kai/ui";
import {
  CHECK_DIRECTION_LABELS,
  checkStatusLabel,
  type CheckEventRow,
  type CheckLinkRow,
  type CheckRow,
  type CheckStatus,
} from "@/features/treasury-checks/types/check.types";
import {
  bounceCheckAction,
  clearCheckAction,
  depositCheckAction,
  endorseCheckAction,
  getCheckByIdAction,
  voidCheckAction,
} from "@/features/treasury-checks/actions/checks.action";

type Props = {
  check: CheckRow | null;
  onClose: () => void;
  onChanged: () => void;
};

function formatMoney(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function CheckDetailDialog({ check, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<{
    check: CheckRow;
    events: CheckEventRow[];
    links: CheckLinkRow[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Acciones inline
  const [bounceReason, setBounceReason] = useState("");
  const [endorseTargetId, setEndorseTargetId] = useState("");
  const [notes, setNotes] = useState("");

  const open = !!check;

  const refetch = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const res = await getCheckByIdAction(id);
    if (res.success) {
      setDetail({ check: res.check, events: res.events, links: res.links });
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!check) {
      setDetail(null);
      setBounceReason("");
      setEndorseTargetId("");
      setNotes("");
      setError(null);
      return;
    }
    void refetch(check.id);
  }, [check, refetch]);

  if (!check) {
    return null;
  }

  const current = detail?.check ?? check;
  const status: CheckStatus = current.status;
  const canDeposit =
    current.direction === "INCOMING" && status === "PENDING";
  const canClear =
    (current.direction === "INCOMING" && status === "DEPOSITED") ||
    (current.direction === "OUTGOING" && status === "PENDING");
  const canBounce = status === "PENDING" || status === "DEPOSITED";
  const canVoid =
    status === "PENDING" || status === "DEPOSITED" || status === "BOUNCED";
  const canEndorse =
    current.direction === "INCOMING" && status === "PENDING";

  async function transition(
    fn: () => Promise<
      | { success: true; check: CheckRow }
      | { success: false; error: string }
    >,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.success) {
        setError(res.error);
        return;
      }
      await refetch(res.check.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={`Cheque ${current.checkNumber} · ${CHECK_DIRECTION_LABELS[current.direction]}`}
      size="lg"
      scroll="paper"
      hideActions
      showCloseButton
    >
      <div className="flex flex-col gap-4" data-test-id="check-detail-dialog">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <section className="grid gap-3 sm:grid-cols-2">
          <Info label="Estado">
            <Badge variant="primary-outlined">
              {checkStatusLabel(status, current.direction)}
            </Badge>
          </Info>
          <Info label="Monto">
            {formatMoney(Number(current.amount), current.currency || "CLP")}
          </Info>
          <Info label="Banco">{current.bankName}</Info>
          <Info label="N° de cheque" mono>
            {current.checkNumber}
          </Info>
          <Info label="Fecha emisión">{current.issueDate}</Info>
          <Info label="A fecha">{current.dueDate ?? "—"}</Info>
          {current.direction === "INCOMING" ? (
            <>
              <Info label="Girador">{current.drawerName ?? "—"}</Info>
              <Info label="RUT/Documento">
                {current.drawerDocument ?? "—"}
              </Info>
            </>
          ) : (
            <>
              <Info label="Beneficiario">{current.payeeName ?? "—"}</Info>
              <Info label="Cuenta giradora" mono>
                {current.bankAccountKey ?? "—"}
              </Info>
            </>
          )}
          {current.depositDate ? (
            <Info label="Fecha depósito">{current.depositDate}</Info>
          ) : null}
          {current.clearedDate ? (
            <Info label="Fecha cobro">{current.clearedDate}</Info>
          ) : null}
          {current.bouncedReason ? (
            <Info label="Motivo protesto">{current.bouncedReason}</Info>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-background p-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Acciones</h3>
          <div className="flex flex-col gap-3">
            <TextField
              label="Notas (opcional)"
              value={notes}
              onChange={(e) =>
                setNotes(
                  (e as React.ChangeEvent<HTMLInputElement>).target.value,
                )
              }
              data-test-id="check-detail-notes"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                disabled={!canDeposit || busy}
                onClick={() =>
                  transition(() =>
                    depositCheckAction(current.id, { notes: notes || undefined }),
                  )
                }
                data-test-id="check-detail-deposit"
              >
                Depositar
              </Button>
              <Button
                variant="primary"
                disabled={!canClear || busy}
                onClick={() =>
                  transition(() =>
                    clearCheckAction(current.id, { notes: notes || undefined }),
                  )
                }
                data-test-id="check-detail-clear"
              >
                Marcar cobrado
              </Button>
              <Button
                variant="outlinedSecondary"
                disabled={!canVoid || busy}
                onClick={() =>
                  transition(() =>
                    voidCheckAction(current.id, { notes: notes || undefined }),
                  )
                }
                data-test-id="check-detail-void"
              >
                Anular
              </Button>
            </div>

            {canBounce ? (
              <div className="flex flex-col gap-2 rounded-md border border-border p-2">
                <TextField
                  label="Motivo de protesto"
                  value={bounceReason}
                  onChange={(e) =>
                    setBounceReason(
                      (e as React.ChangeEvent<HTMLInputElement>).target.value,
                    )
                  }
                  data-test-id="check-detail-bounce-reason"
                />
                <Button
                  variant="danger"
                  disabled={busy || bounceReason.trim().length === 0}
                  onClick={() =>
                    transition(() =>
                      bounceCheckAction(current.id, {
                        reason: bounceReason.trim(),
                        notes: notes || undefined,
                      }),
                    )
                  }
                  data-test-id="check-detail-bounce"
                >
                  Marcar protestado
                </Button>
              </div>
            ) : null}

            {canEndorse ? (
              <div className="flex flex-col gap-2 rounded-md border border-border p-2">
                <TextField
                  label="UUID de transacción destino del endoso"
                  value={endorseTargetId}
                  onChange={(e) =>
                    setEndorseTargetId(
                      (e as React.ChangeEvent<HTMLInputElement>).target.value,
                    )
                  }
                  data-test-id="check-detail-endorse-target"
                />
                <Button
                  variant="primary"
                  disabled={busy || endorseTargetId.trim().length === 0}
                  onClick={() =>
                    transition(() =>
                      endorseCheckAction(current.id, {
                        targetTransactionId: endorseTargetId.trim(),
                        notes: notes || undefined,
                      }),
                    )
                  }
                  data-test-id="check-detail-endorse"
                >
                  Endosar a transacción
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Historial
          </h3>
          {loading ? (
            <LoadingState className="flex items-center justify-center py-4" />
          ) : detail && detail.events.length > 0 ? (
            <ol className="flex flex-col gap-1 text-sm">
              {detail.events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-border bg-background px-3 py-2"
                  data-test-id={`check-event-${ev.id}`}
                >
                  <div className="flex items-baseline gap-2">
                    {ev.fromStatus ? (
                      <Badge variant="secondary-outlined">
                        {checkStatusLabel(ev.fromStatus, current.direction)}
                      </Badge>
                    ) : null}
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="primary-outlined">
                      {checkStatusLabel(ev.toStatus, current.direction)}
                    </Badge>
                    {ev.notes ? (
                      <span className="text-xs text-muted-foreground">
                        {ev.notes}
                      </span>
                    ) : null}
                  </div>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={ev.at}
                  >
                    {new Date(ev.at).toLocaleString("es-CL")}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Sin eventos.</p>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function Info({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>{children}</span>
    </div>
  );
}
