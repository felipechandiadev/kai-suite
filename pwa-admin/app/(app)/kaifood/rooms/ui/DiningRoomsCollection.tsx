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

type Props = {
  initialRooms: DiningRoomListItem[];
  branches: BranchListItem[];
};

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
                <Link
                  key={r.id}
                  href={`/kaifood/rooms/${r.id}`}
                  className="rounded-lg border border-border bg-card p-4 block hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant={r.isActive ? "success" : "secondary"}>
                      {r.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {branchName(r.branchId)} · {(r.tables?.length ?? 0)} mesas
                  </p>
                </Link>
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
      />

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo salón">
        <div className="flex flex-col gap-3 min-w-[320px]">
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
