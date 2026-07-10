"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@kai/ui";
import { Button } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { FiscalCafPackage, FiscalCafPackageDetail } from "../types/fiscal.types";
import { dteTypeLabel } from "@/features/sales-points-of-sale/types/pos-fiscal.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import { AssignSubPackDialog } from "./AssignSubPackDialog";
import { FolioLedgerDialog } from "./FolioLedgerDialog";
import { FolioSubPackRow } from "./FolioSubPackRow";
import {
  deleteFiscalPackageAction,
  getFiscalCafPackageDetailAction,
} from "../actions/fiscal.actions";

type Props = {
  pkg: FiscalCafPackage;
  pointsOfSale: PointOfSaleListItem[];
  highlight?: boolean;
};

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return { label: "Activo", variant: "success-outlined" as const };
    case "archived":
      return { label: "Archivado", variant: "secondary-outlined" as const };
    case "exhausted":
      return { label: "Agotado", variant: "warning-outlined" as const };
    default:
      return { label: status, variant: "secondary-outlined" as const };
  }
}

function envLabel(env: string): string {
  return env === "production" ? "Producción" : "Certificación";
}

export function FolioPackageCard({ pkg, pointsOfSale, highlight }: Props) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detail, setDetail] = useState<FiscalCafPackageDetail | null>(null);
  const [ledgerSubPack, setLedgerSubPack] = useState<{
    allocationId: string;
    label: string;
    rangeFrom: number;
    rangeTo: number;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingDetail(true);
      const res = await getFiscalCafPackageDetailAction(pkg.id);
      if (cancelled) return;
      setLoadingDetail(false);
      if (res.success) setDetail(res.package);
    })();
    return () => {
      cancelled = true;
    };
  }, [pkg.id]);

  const badge = statusBadge(pkg.status);
  const subPacks = detail?.subPacks ?? [];

  async function ensureDetail() {
    if (detail?.id === pkg.id) return detail;
    setLoadingDetail(true);
    const res = await getFiscalCafPackageDetailAction(pkg.id);
    setLoadingDetail(false);
    if (res.success) {
      setDetail(res.package);
      return res.package;
    }
    return null;
  }

  async function openPackLedger() {
    await ensureDetail();
    setLedgerSubPack(null);
    setLedgerOpen(true);
  }

  async function openSubPackLedger(
    allocationId: string,
    label: string,
    rangeFrom: number,
    rangeTo: number,
  ) {
    setLedgerSubPack({ allocationId, label, rangeFrom, rangeTo });
    setLedgerOpen(true);
  }

  async function openAssign() {
    await ensureDetail();
    setAssignOpen(true);
  }

  return (
    <>
      <article
        className={`rounded-lg border bg-background p-4 shadow-sm ${
          highlight ? "border-primary ring-1 ring-primary/30" : "border-border"
        }`}
        data-test-id={`folio-package-card-${pkg.id}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-sm font-semibold">{pkg.packageCode}</h3>
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-xs text-muted-foreground">{envLabel(pkg.environment)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {dteTypeLabel(pkg.dteType)}
              {pkg.label ? ` · ${pkg.label}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void openPackLedger()}>
              Ver folios
            </Button>
            {pkg.status === "active" ? (
              <Button size="sm" onClick={() => void openAssign()} disabled={loadingDetail}>
                Asignar a POS
              </Button>
            ) : null}
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setDeleteErrors([]);
                setDeleteOpen(true);
              }}
              data-test-id={`folio-package-delete-${pkg.id}`}
            >
              Eliminar
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FolioRangeStat label="Folio inicio" value={pkg.rangeFrom} />
          <FolioRangeStat label="Folio término" value={pkg.rangeTo} />
          <FolioRangeStat label="Siguiente folio" value={pkg.nextFolio} className="col-span-2 sm:col-span-1" />
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          <Stat label="Total" value={pkg.stats.totalFolios} />
          <Stat label="Asignados" value={pkg.stats.assignedCount} />
          <Stat label="Emitidos" value={pkg.stats.emittedCount} />
          <Stat label="Disponibles" value={pkg.stats.available} />
          <Stat label="Sub-paquetes" value={pkg.stats.subPackCount} />
        </dl>

        {subPacks.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sub-paquetes
            </p>
            {subPacks.map((sp) => (
              <FolioSubPackRow
                key={sp.id}
                subPack={sp}
                onViewFolios={() =>
                  void openSubPackLedger(sp.id, sp.label ?? sp.subPackCode, sp.rangeFrom, sp.rangeTo)
                }
              />
            ))}
          </div>
        ) : loadingDetail ? (
          <p className="mt-3 text-xs text-muted-foreground">Cargando sub-paquetes…</p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Sin sub-paquetes asignados a POS.
          </p>
        )}
      </article>

      <AssignSubPackDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        pkg={pkg}
        pointsOfSale={pointsOfSale}
      />

      <FolioLedgerDialog
        open={ledgerOpen}
        onClose={() => {
          setLedgerOpen(false);
          setLedgerSubPack(null);
        }}
        title={
          ledgerSubPack
            ? `Folios · ${ledgerSubPack.label}`
            : `Folios · ${pkg.packageCode}`
        }
        cafId={ledgerSubPack ? undefined : pkg.id}
        allocationId={ledgerSubPack?.allocationId}
        folioFrom={ledgerSubPack?.rangeFrom ?? pkg.rangeFrom}
        folioTo={ledgerSubPack?.rangeTo ?? pkg.rangeTo}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar paquete de folios"
        message={
          <>
            ¿Eliminar el paquete <strong className="font-semibold">«{pkg.packageCode}»</strong>? Se
            eliminarán también todas las asignaciones a POS asociadas. No se puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        data-test-id={`folio-package-delete-dialog-${pkg.id}`}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const res = await deleteFiscalPackageAction(pkg.id);
              if (res.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([res.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
      />
    </>
  );
}

function FolioRangeStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-border/70 bg-muted/25 px-3 py-2 ${className}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
