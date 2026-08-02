"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Button, CollectionPageLayout, Dialog, Select, TextField } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import {
  createDiningRoomAction,
} from "@/features/kaifood-dining/actions/dining-room.action";
import type { DiningRoomListItem } from "@/features/kaifood-dining/types/dining-room.types";
import { FloorPlanMiniPreview } from "./FloorPlanMiniPreview";

type Props = {
  initialRooms: DiningRoomListItem[];
  branches: BranchListItem[];
};

function DiningRoomCard({
  room,
  branchLabel,
}: {
  room: DiningRoomListItem;
  branchLabel: string;
}) {
  const tables = room.tables ?? [];
  const tableCount = tables.length;
  const capacity = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

  return (
    <Link
      href={`/kaifood/rooms/${room.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20 hover:bg-muted/30"
      data-test-id={`dining-room-card-${room.id}`}
    >
      <FloorPlanMiniPreview tables={tables} />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground group-hover:underline">
            {room.name}
          </h2>
          <Badge variant={room.isActive ? "success" : "secondary"}>
            {room.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{branchLabel}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {tableCount} {tableCount === 1 ? "mesa" : "mesas"}
          {capacity > 0 ? ` · ${capacity} pax` : ""}
        </p>
      </div>
    </Link>
  );
}

export function DiningRoomsCollection({ initialRooms, branches }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();
  const [rooms, setRooms] = useState(initialRooms);
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter((r) => r.name.toLowerCase().includes(q));
  }, [rooms, q]);

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? id;

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const result = await createDiningRoomAction({
      branchId,
      name: name.trim(),
      isActive: true,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setRooms((prev) => [...prev, result.room]);
    setOpen(false);
    setName("");
  };

  return (
    <>
      <CollectionPageLayout
        title="Salones"
        onAddClick={() => setOpen(true)}
        addButtonAriaLabel="Agregar salón"
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Nombre del salón"
        contentEmptyMessage="No hay salones configurados"
        contentItems={
          filtered.length > 0
            ? filtered.map((r) => (
                <DiningRoomCard
                  key={r.id}
                  room={r}
                  branchLabel={branchName(r.branchId)}
                />
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2 }}
        contentGridGapClassName="gap-5"
      />

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo salón">
        <div className="flex w-full min-w-[320px] flex-col gap-3">
          <Select
            label="Sucursal"
            value={branchId}
            onChange={(v) => setBranchId(String(v))}
            options={branches.map((b) => ({ id: b.id, label: b.name }))}
          />
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={saving || !name.trim()}
              onClick={handleCreate}
            >
              Crear
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
