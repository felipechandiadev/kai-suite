"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Hash, Briefcase } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { CompanyDetail } from "@/features/companies/types/company.types";
import { removeCompanyAction } from "@/features/companies/actions/companies.action";
import { UpdateCompanyDialog } from "./UpdateCompanyDialog";

type CompanyCardProps = {
  company: CompanyDetail;
  "data-test-id"?: string;
};

export function CompanyCard({
  company,
  "data-test-id": dataTestId,
}: CompanyCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fantasiaLine = (company.nombreFantasia ?? "").trim();
  const giroLine = (company.businessActivity ?? "").trim();

  return (
    <>
      <Card
        data-test-id={dataTestId}
        media={
          <div
            className="flex min-h-32 w-full items-center justify-center bg-neutral-100"
            aria-hidden
          >
            <Building2 className="h-12 w-12 text-muted" />
          </div>
        }
        title={company.razonSocial}
        content={
          <div
            className="flex flex-col gap-3 text-sm"
            data-test-id="company-card-details"
          >
            <div className="flex min-h-[1.35rem] items-start gap-2.5">
              <Hash
                className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 flex-1 break-words text-foreground">
                {company.rut || "Sin RUT"}
              </span>
            </div>
            <div className="flex min-h-[1.35rem] items-start gap-2.5">
              <Briefcase
                className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 flex-1 break-words text-foreground">
                {giroLine || "Sin giro"}
              </span>
            </div>
            {fantasiaLine ? (
              <div className="text-muted">{fantasiaLine}</div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/5"
                  style={{
                    backgroundColor: company.isActive
                      ? "var(--color-success)"
                      : "var(--color-error)",
                  }}
                  aria-hidden
                />
                <span className="text-foreground">
                  {company.isActive ? "Activa" : "Inactiva"}
                </span>
              </span>
              <span className="text-muted">· {company.defaultCurrency}</span>
            </div>
          </div>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar empresa",
            onClick: () => setUpdateOpen(true),
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar empresa",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
          },
        ]}
      />
      <UpdateCompanyDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        company={company}
        onSuccess={() => router.refresh()}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar empresa"
        message={
          <>
            ¿Eliminar la empresa{" "}
            <strong className="font-semibold">«{company.razonSocial}»</strong>?
            Sus datos asociados (sucursales, productos, etc.) bloquearán esta
            operación si existen.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await removeCompanyAction(company.id);
              if (r.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "company-card"}-delete-dialog`}
      />
    </>
  );
}
