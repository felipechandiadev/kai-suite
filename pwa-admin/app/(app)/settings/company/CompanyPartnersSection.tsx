"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import type { ShareholderRow } from "@/features/settings-shareholders/types/shareholder.types";
import { deleteShareholderAction } from "@/features/settings-shareholders/actions/shareholder.action";
import { partnerTypeLabel } from "@/features/settings-shareholders/lib/partner-type-labels";
import { CreatePartnerDialog } from "./CreatePartnerDialog";

function partnerLabel(row: ShareholderRow): string {
  const p = row.person;
  const name =
    p?.displayName?.trim() ||
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() ||
    p?.businessName?.trim() ||
    "Socio";
  return name;
}

type Props = {
  companyId: string;
  shareholders: ShareholderRow[];
};

export function CompanyPartnersSection({ companyId, shareholders }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const rows = useMemo(() => shareholders ?? [], [shareholders]);

  return (
    <>
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
        data-test-id="settings-company-partners-section"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Socios</h2>
          <IconButton
            icon="Plus"
            variant="action"
            ariaLabel="Agregar socio"
            onClick={() => setDialogOpen(true)}
            data-test-id="settings-company-partners-add"
          />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay socios registrados.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3 text-sm"
                data-test-id={`company-partner-card-${row.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{partnerLabel(row)}</span>
                  <IconButton
                    icon="Trash2"
                    variant="action"
                    size="sm"
                    ariaLabel="Eliminar socio"
                    onClick={() => {
                      void (async () => {
                        await deleteShareholderAction(companyId, row.id);
                        router.refresh();
                      })();
                    }}
                  />
                </div>
                <dl className="grid gap-1 text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Participación</dt>
                    <dd>{row.ownershipPercentage != null ? `${row.ownershipPercentage}%` : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Tipo</dt>
                    <dd>{partnerTypeLabel(row.partnerType)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Ingreso</dt>
                    <dd>{row.joinDate ?? "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreatePartnerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        companyId={companyId}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
