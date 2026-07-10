"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Package, Tag } from "lucide-react";
import { Card } from "@kai/ui";
import Badge from "@kai/ui";
import { Switch } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { storageCategoryLabel, storageTypeLabel } from "@/features/inventory-storages/types/storage.types";
import {
  deleteStorageAction,
  updateStorageActiveAction,
} from "@/features/inventory-storages/actions/storage.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import LocationPicker from "@/shared/components/LocationPicker/LocationPickerWrapper";
import { parseStorageLocation } from "@/features/inventory-storages/utils/parse-storage-location";
import { UpdateStorageDialog } from "./UpdateStorageDialog";

type StorageCardProps = {
  storage: StorageListItem;
  branches: BranchListItem[];
  "data-test-id"?: string;
};

export function StorageCard({
  storage,
  branches,
  "data-test-id": dataTestId,
}: StorageCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [active, setActive] = useState(storage.isActive);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActive(storage.isActive);
  }, [storage.isActive, storage.id]);

  const headerEnd = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5" data-test-id="storage-card-header-badges">
      {storage.isDefault ? (
        <Badge variant="primary-outlined" className="text-[0.65rem]">
          Predeterminado
        </Badge>
      ) : null}
      <Badge variant={storage.isActive ? "success" : "secondary-outlined"}>
        {storage.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </div>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="storage-card-media"
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
        <Package className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="storage-card-body">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Sucursal
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="storage-card-branch">
          {storage.branch?.name ?? "Sin sucursal"}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Ubicación
        </p>
        {(() => {
          const coords = parseStorageLocation(storage.location);
          if (!coords) {
            return (
              <p className="text-sm text-foreground" data-test-id="storage-card-location-empty">
                Ubicación no indicada
              </p>
            );
          }
          return (
            <div className="mt-2 overflow-hidden rounded-md border border-border" data-test-id="storage-card-location-map">
              <LocationPicker
                key={`storage-map-${storage.id}`}
                mode="viewer"
                variant="borderless"
                rounded="none"
                className="w-full"
                zoom={16}
                initialLat={coords.lat}
                initialLng={coords.lng}
                draggable={false}
                height={18}
              />
            </div>
          );
        })()}
        <p className="mt-2 text-sm text-foreground" data-test-id="storage-card-address">
          {(storage.address ?? "").trim() ? (storage.address as string).trim() : "—"}
        </p>
        {storage.capacity != null ? (
          <p className="mt-1 text-xs text-muted-foreground">Capacidad: {storage.capacity}</p>
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tag className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Tipo y categoría
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="info-outlined">{storageTypeLabel(storage.type)}</Badge>
          <Badge variant="warning-outlined">{storageCategoryLabel(storage.category)}</Badge>
          {storage.code ? (
            <Badge variant="secondary-outlined" className="font-mono">
              {storage.code}
            </Badge>
          ) : null}
        </div>
      </div>

      {activeError ? (
        <p className="text-sm text-red-600" role="alert" data-test-id="storage-card-active-error">
          {activeError}
        </p>
      ) : null}

      <div className="mt-auto">
        <Switch
          checked={active}
          disabled={isPending}
          onChange={(v) => {
            setActiveError(null);
            const prev = active;
            setActive(v);
            startTransition(() => {
              void (async () => {
                const r = await updateStorageActiveAction(storage.id, v);
                if (!r.success) {
                  setActive(prev);
                  setActiveError(r.error);
                } else {
                  await router.refresh();
                }
              })();
            });
          }}
          label="Activo en catálogo"
          labelPosition="right"
          data-test-id="storage-card-active-switch"
        />
      </div>
    </div>
  );

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={storage.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar almacén",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "storage-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar almacén",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "storage-card-delete",
          },
        ]}
      />
      <UpdateStorageDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        storage={storage}
        branches={branches}
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
        title="Eliminar almacén"
        message={
          <>
            ¿Eliminar el almacén <strong className="font-semibold">«{storage.name}»</strong>? Esta acción no se puede
            deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteStorageAction(storage.id);
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
        data-test-id={`${dataTestId ?? "storage-card"}-delete-dialog`}
      />
    </>
  );
}
