"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SelectDefault as Select } from "@kai/ui";
import { Button } from "@kai/ui";
import type {
  PosFiscalPolicy,
  PosFolioAllocation,
  SaleDocumentKind,
} from "../types/pos-fiscal.types";
import { SALE_DOCUMENT_KIND_LABELS } from "../types/pos-fiscal.types";
import { FolioLedgerDialog } from "@/features/fiscal/ui/FolioLedgerDialog";

const BOLETA_DTE = 39;

type Props = {
  posId: string;
  initialPolicy: PosFiscalPolicy;
  initialAllocations: PosFolioAllocation[];
  companyCaf39: { rangeFrom: number; rangeTo: number; packageCode?: string } | null;
  disabled?: boolean;
  onChange: (payload: { policy: PosFiscalPolicy }) => void;
};

const ALL_KINDS: SaleDocumentKind[] = ["TICKET", "BOLETA", "FACTURA"];

/** Tipos visibles en UI pero aún no configurables por POS. */
const DISABLED_DOCUMENT_KINDS = [
  { id: "NOTA_CREDITO", label: "Nota de crédito electrónica (61)" },
] as const;

export function PosFiscalSettingsEditor({
  posId,
  initialPolicy,
  initialAllocations,
  companyCaf39,
  disabled,
  onChange,
}: Props) {
  const [policy, setPolicy] = useState<PosFiscalPolicy>(initialPolicy);
  const [ledgerAllocation, setLedgerAllocation] = useState<PosFolioAllocation | null>(null);

  const boletaAllocs = useMemo(
    () => initialAllocations.filter((a) => a.dteType === BOLETA_DTE && a.isActive),
    [initialAllocations],
  );

  const currentBoletaAlloc = useMemo(
    () => boletaAllocs.find((a) => a.isCurrent) ?? boletaAllocs[0] ?? null,
    [boletaAllocs],
  );

  const totalAvailableBoletaFolios = useMemo(
    () => boletaAllocs.reduce((sum, a) => sum + (a.availableFolios ?? 0), 0),
    [boletaAllocs],
  );

  useEffect(() => {
    setPolicy(initialPolicy);
  }, [initialPolicy]);

  const defaultOptions = useMemo(
    () =>
      policy.allowedDocumentKinds.map((k) => ({
        id: k,
        label: SALE_DOCUMENT_KIND_LABELS[k],
      })),
    [policy.allowedDocumentKinds],
  );

  function notifyParent(nextPolicy: PosFiscalPolicy) {
    onChange({ policy: nextPolicy });
  }

  function toggleKind(kind: SaleDocumentKind, checked: boolean) {
    let allowed = checked
      ? [...new Set([...policy.allowedDocumentKinds, kind])]
      : policy.allowedDocumentKinds.filter((k) => k !== kind);
    if (!allowed.includes("TICKET")) allowed = ["TICKET", ...allowed];
    let defaultDocumentKind = policy.defaultDocumentKind;
    if (!allowed.includes(defaultDocumentKind)) {
      defaultDocumentKind = allowed[0] ?? "TICKET";
    }
    const next = { allowedDocumentKinds: allowed, defaultDocumentKind };
    setPolicy(next);
    notifyParent(next);
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-3" data-test-id="pos-fiscal-editor">
      <div>
        <p className="text-sm font-medium text-foreground">Documentos tributarios</p>
        <p className="text-xs text-muted-foreground">
          Tipos que el cajero puede elegir al cobrar en este POS.
        </p>
      </div>

      <ul className="space-y-2">
        {ALL_KINDS.map((kind) => {
          const isFactura = kind === "FACTURA";
          const checked = policy.allowedDocumentKinds.includes(kind);
          return (
            <li key={kind} className="flex items-start gap-2">
              <input
                type="checkbox"
                id={`pos-fiscal-kind-${kind}`}
                className="mt-0.5 h-4 w-4 rounded border-border"
                checked={checked}
                disabled={disabled || kind === "TICKET" || isFactura}
                onChange={(e) => toggleKind(kind, e.target.checked)}
              />
              <label htmlFor={`pos-fiscal-kind-${kind}`} className="text-sm">
                {SALE_DOCUMENT_KIND_LABELS[kind]}
              </label>
            </li>
          );
        })}
        {DISABLED_DOCUMENT_KINDS.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              id={`pos-fiscal-kind-${item.id}`}
              className="mt-0.5 h-4 w-4 rounded border-border"
              checked={false}
              disabled
              readOnly
            />
            <label htmlFor={`pos-fiscal-kind-${item.id}`} className="text-sm text-muted-foreground">
              {item.label}
            </label>
          </li>
        ))}
      </ul>

      {defaultOptions.length > 1 ? (
        <Select
          label="Documento por defecto"
          name="pos-fiscal-default"
          value={policy.defaultDocumentKind}
          onChange={(id) => {
            if (id == null) return;
            const defaultDocumentKind = String(id) as SaleDocumentKind;
            const next = { ...policy, defaultDocumentKind };
            setPolicy(next);
            notifyParent(next);
          }}
          options={defaultOptions}
          disabled={disabled}
          data-test-id="pos-fiscal-default"
        />
      ) : null}

      {policy.allowedDocumentKinds.includes("BOLETA") ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Folios boleta asignados</p>
            <Link
              href={
                currentBoletaAlloc?.cafId
                  ? `/settings/sii/folios?package=${encodeURIComponent(currentBoletaAlloc.cafId)}`
                  : "/settings/sii/folios"
              }
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Gestionar folios
            </Link>
          </div>

          {boletaAllocs.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Total disponible en sub-paquetes activos:{" "}
              <span className="font-semibold tabular-nums">{totalAvailableBoletaFolios}</span>
            </p>
          ) : null}

          {!companyCaf39 ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              No hay CAF de boleta en producción.{" "}
              <Link href="/settings/sii/folios" className="underline">
                Cargar en Folios SII
              </Link>
            </p>
          ) : boletaAllocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Este POS no tiene sub-paquete asignado. Cree uno en{" "}
              <Link href="/settings/sii/folios" className="underline">
                Folios SII
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {boletaAllocs.map((alloc) => (
                <li
                  key={alloc.id}
                  className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {alloc.label?.trim() || alloc.packageCode || "Sub-paquete boleta"}
                        {alloc.isCurrent ? (
                          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                            Corriente
                          </span>
                        ) : alloc.isExhausted ? (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Agotado
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                            Standby
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {alloc.subPackCode ?? alloc.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alloc.rangeFrom}–{alloc.rangeTo} · siguiente {alloc.nextFolio} ·
                        disponibles {alloc.availableFolios}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setLedgerAllocation(alloc)}
                    >
                      Ver folios
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <FolioLedgerDialog
        open={ledgerAllocation != null}
        onClose={() => setLedgerAllocation(null)}
        title={
          ledgerAllocation
            ? `Folios · ${ledgerAllocation.label?.trim() || ledgerAllocation.subPackCode || "POS"}`
            : "Folios"
        }
        allocationId={ledgerAllocation?.id}
        cafId={ledgerAllocation?.cafId}
        folioFrom={ledgerAllocation?.rangeFrom}
        folioTo={ledgerAllocation?.rangeTo}
        pointOfSaleId={posId}
      />
    </div>
  );
}
