"use client";

import { Building2, Factory, Package, Users, Wrench } from "lucide-react";
import { Badge, Card } from "@kai/ui";
import type { ProductionUnitListItem } from "@/features/inventory-production-units/types/production-unit.types";

type Props = {
  unit: ProductionUnitListItem;
  branchLabel: string;
  inputStorageLabel: string | null;
  onEdit: (unit: ProductionUnitListItem) => void;
  "data-test-id"?: string;
};

export function ProductionUnitCard({
  unit,
  branchLabel,
  inputStorageLabel,
  onEdit,
  "data-test-id": dataTestId,
}: Props) {
  const capacity = unit.computedCapacity ?? unit.monthlyCapacity;
  const headerEnd = (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"
      data-test-id="production-unit-card-header-badges"
    >
      <Badge variant={unit.isActive ? "success" : "secondary-outlined"}>
        {unit.isActive ? "Activa" : "Inactiva"}
      </Badge>
    </div>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="production-unit-card-media"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <Factory className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3"
      data-test-id="production-unit-card-body"
    >
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Sucursal / alcance
        </p>
        <p className="text-sm font-medium leading-snug text-foreground">
          {branchLabel}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{unit.code}</p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Package className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Almacén de insumos
        </p>
        <p className="text-sm text-foreground">{inputStorageLabel ?? "—"}</p>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Wrench className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Configuración
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="info-outlined">
            {unit.purpose === "BATCH" ? "Producción por lotes" : "Cocina"}
          </Badge>
          {unit.purpose === "KITCHEN" ? (
            <>
              <Badge variant="info-outlined">
                {unit.kitchenFulfillmentMode === "PRINTED"
                  ? "Comanda impresa"
                  : unit.kitchenFulfillmentMode === "BOTH"
                    ? "KDS + impresa"
                    : "KDS"}
              </Badge>
              {unit.kitchenFulfillmentMode === "PRINTED" ||
              unit.kitchenFulfillmentMode === "BOTH" ? (
                <Badge variant="secondary-outlined">Impresora en POS/Waiter</Badge>
              ) : null}
            </>
          ) : null}
          <Badge variant="warning-outlined">
            {unit.inventoryMode === "AUTONOMOUS" ? "Autónoma" : "Dependiente"}
          </Badge>
          <Badge variant="secondary-outlined">
            {unit.scope === "COMPANY" ? "Empresa" : "Sucursal"}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Equipo y MO
        </p>
        <p className="text-sm text-foreground">
          {unit.employeeCount ?? 0} en equipo
          {(unit.laborUnitIds?.length ?? 0) > 0
            ? ` · ${unit.laborUnitIds!.length} UL`
            : ""}
          {(unit.employeeIds?.length ?? 0) > 0
            ? ` · ${unit.employeeIds!.length} directo(s)`
            : ""}
          {unit.monthlyPayrollTotal != null
            ? ` · nómina ${unit.monthlyPayrollTotal}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {capacity != null ? `${capacity} pzas/30d` : "Sin historial 30d"}
          {unit.laborCostPerUnit != null
            ? ` · MO ${unit.laborCostPerUnit}/u`
            : " · MO —"}
        </p>
      </div>
    </div>
  );

  return (
    <Card
      fillHeight
      className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
      data-test-id={dataTestId}
      media={media}
      title={unit.name}
      headerEnd={headerEnd}
      content={content}
      actions={[
        {
          id: "update",
          icon: "Pencil",
          ariaLabel: "Editar unidad de producción",
          onClick: () => onEdit(unit),
          "data-test-id": "production-unit-card-update",
        },
      ]}
    />
  );
}
