"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { parseBranchLocation } from "@/features/settings-branches/utils/parse-branch-location";
import { deleteBranchAction } from "@/features/settings-branches/actions/branch.action";
import LocationPicker from "@/shared/components/LocationPicker/LocationPickerWrapper";
import { UpdateBranchDialog } from "./UpdateBranchDialog";

type BranchCardProps = {
  branch: BranchListItem;
  "data-test-id"?: string;
};

export function BranchCard({ branch, "data-test-id": dataTestId }: BranchCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const coords = parseBranchLocation(branch.location);
  const phoneLine = (branch.phone ?? "").trim();
  const addressLine = (branch.address ?? "").trim();

  const media = coords ? (
    <LocationPicker
      key={`map-${branch.id}`}
      mode="viewer"
      variant="borderless"
      rounded="none"
      className="w-full"
      zoom={16}
      initialLat={coords.lat}
      initialLng={coords.lng}
      draggable={false}
    />
  ) : (
    <div
      className="flex min-h-36 w-full flex-col items-center justify-center gap-2 bg-neutral-100 px-4 text-center"
      data-test-id="branch-card-no-map"
    >
      <MapPin className="h-8 w-8 text-muted" aria-hidden />
      <p className="text-sm text-muted">Ubicación no indicada en mapa</p>
    </div>
  );

  return (
    <>
    <Card
      data-test-id={dataTestId}
      media={media}
      title={branch.name}
      content={
        <div className="flex flex-col gap-3 text-sm" data-test-id="branch-card-details">
          <div
            className="flex min-h-[1.35rem] items-start gap-2.5"
            data-test-id="branch-card-phone-row"
            title={!phoneLine ? "Teléfono no agregado" : undefined}
          >
            <Phone
              className="mt-0.5 h-4 w-4 shrink-0 text-muted"
              strokeWidth={2}
              aria-hidden
            />
            <span className="min-w-0 flex-1 break-words text-foreground" aria-label={!phoneLine ? "Teléfono no agregado" : undefined}>
              {phoneLine || "\u00A0"}
            </span>
          </div>
          <div
            className="flex min-h-[1.35rem] items-start gap-2.5"
            data-test-id="branch-card-address-row"
            title={!addressLine ? "Dirección no agregada" : undefined}
          >
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-muted"
              strokeWidth={2}
              aria-hidden
            />
            <span className="min-w-0 flex-1 break-words text-foreground" aria-label={!addressLine ? "Dirección no agregada" : undefined}>
              {addressLine || "\u00A0"}
            </span>
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            data-test-id="branch-card-status-row"
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/5"
                style={{
                  backgroundColor: branch.isActive
                    ? "var(--color-success)"
                    : "var(--color-error)",
                }}
                aria-hidden
              />
              <span className="text-foreground">
                {branch.isActive ? "Activa" : "Inactiva"}
              </span>
            </span>
            {branch.isHeadquarters ? (
              <span className="text-muted">· Sede</span>
            ) : null}
          </div>
        </div>
      }
      actions={[
        {
          id: "update",
          icon: "Pencil",
          ariaLabel: "Actualizar sucursal",
          onClick: () => {
            setUpdateOpen(true);
          },
          "data-test-id": "branch-card-update",
        },
        {
          id: "delete",
          icon: "Trash2",
          ariaLabel: "Eliminar sucursal",
          disabled: isDeleting,
          onClick: () => {
            setDeleteErrors([]);
            setDeleteOpen(true);
          },
          "data-test-id": "branch-card-delete",
        },
      ]}
    />
    <UpdateBranchDialog
      open={updateOpen}
      onClose={() => setUpdateOpen(false)}
      branch={branch}
      onSuccess={async () => {
        await router.refresh();
      }}
    />
    <DeleteDialog
      open={deleteOpen}
      onClose={() => {
        if (!isDeleting) {
          setDeleteOpen(false);
          setDeleteErrors([]);
        }
      }}
      title="Eliminar sucursal"
      message={
        <>
          ¿Eliminar la sucursal <strong className="font-semibold">«{branch.name}»</strong>? Esta acción no
          se puede deshacer.
        </>
      }
      errors={deleteErrors}
      isSubmitting={isDeleting}
      onConfirm={() => {
        setDeleteErrors([]);
        setIsDeleting(true);
        void (async () => {
          try {
            const r = await deleteBranchAction(branch.id);
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
      data-test-id={`${dataTestId ?? "branch-card"}-delete-dialog`}
    />
    </>
  );
}
