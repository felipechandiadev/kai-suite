"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { OrganizationalUnitListItem } from "@/features/hr-organizational-units/types/organizational-unit.types";

const UNIT_TYPE_LABEL: Record<string, string> = {
  HEADQUARTERS: "Casa matriz",
  STORE: "Tienda",
  BACKOFFICE: "Backoffice",
  OPERATIONS: "Operaciones",
  SALES: "Ventas",
  OTHER: "Otro",
};

type OrganizationalUnitsCollectionProps = {
  initialUnits: OrganizationalUnitListItem[];
  includeInactive: boolean;
};

function OrganizationalUnitCard({ unit }: { unit: OrganizationalUnitListItem }) {
  const typeLabel = UNIT_TYPE_LABEL[unit.unitType] ?? unit.unitType;
  return (
    <div
      className="flex h-full min-h-[120px] flex-col rounded-lg border border-border bg-card p-4 shadow-sm"
      data-test-id={`org-unit-card-${unit.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{unit.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unit.code} · {typeLabel}
          </p>
        </div>
        {unit.isActive === false ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactiva</span>
        ) : null}
      </div>
      {unit.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{unit.description}</p>
      ) : null}
      <dl className="mt-auto pt-3 text-xs text-muted-foreground">
        {unit.branch?.name ? (
          <div className="flex gap-1">
            <dt className="font-medium text-foreground/80">Sucursal:</dt>
            <dd>{unit.branch.name}</dd>
          </div>
        ) : null}
        {unit.resultCenter?.name ? (
          <div className="mt-1 flex gap-1">
            <dt className="font-medium text-foreground/80">Centro resultado:</dt>
            <dd>{unit.resultCenter.name}</dd>
          </div>
        ) : null}
        {unit.parent?.name ? (
          <div className="mt-1 flex gap-1">
            <dt className="font-medium text-foreground/80">Depende de:</dt>
            <dd>{unit.parent.name}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function OrganizationalUnitsCollection({
  initialUnits,
  includeInactive,
}: OrganizationalUnitsCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialUnits;
    }
    return initialUnits.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.branch?.name && u.branch.name.toLowerCase().includes(q)) ||
        (u.description && u.description.toLowerCase().includes(q)),
    );
  }, [initialUnits, q]);

  const inactiveToggleHref = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (includeInactive) {
      p.delete("includeInactive");
    } else {
      p.set("includeInactive", "1");
    }
    const qs = p.toString();
    return qs ? `/hr/organizational-units?${qs}` : "/hr/organizational-units";
  }, [includeInactive, searchParams]);

  const inactiveToggleLabel = includeInactive ? "Solo activas" : "Incluir inactivas";

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex justify-end px-0 sm:px-1">
        <Link
          href={inactiveToggleHref}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-test-id="org-units-toggle-inactive"
        >
          {inactiveToggleLabel}
        </Link>
      </div>
      <CollectionPageLayout
        title="Unidades organizativas"
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Buscar"
        contentEmptyMessage="No hay unidades que mostrar"
        contentItems={
          filtered.length > 0
            ? filtered.map((u) => <OrganizationalUnitCard key={u.id} unit={u} />)
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="organizational-units-collection"
      />
    </div>
  );
}
