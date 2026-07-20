"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  DataGridTable as DataGrid,
  Dialog,
  Select,
  TextField,
  type DataGridColumn,
} from "@kai/ui";
import {
  createJornadaTemplateAction,
  deleteJornadaTemplateAction,
} from "@/features/hr-jornada/actions/jornada.action";
import type { ShiftTemplateView } from "@/features/hr-jornada/types/jornada.types";
import { TEMPLATE_TYPE_LABELS } from "@/features/hr-jornada/types/jornada.types";

export function JornadaTemplatesPanel({
  templates,
}: {
  templates: ShiftTemplateView[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("WEEKLY");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 160,
        valueGetter: ({ row }) => (row as ShiftTemplateView).name,
      },
      {
        field: "type",
        headerName: "Tipo",
        width: 140,
        valueGetter: ({ row }) => {
          const r = row as ShiftTemplateView;
          return TEMPLATE_TYPE_LABELS[r.type] ?? r.type;
        },
      },
      {
        field: "isNight",
        headerName: "Noche",
        width: 90,
        valueGetter: ({ row }) => ((row as ShiftTemplateView).isNight ? "Sí" : "No"),
      },
      {
        field: "actions",
        headerName: "",
        width: 110,
        sortable: false,
        renderCell: ({ row }) => {
          const r = row as ShiftTemplateView;
          return (
            <Button
              variant="text"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await deleteJornadaTemplateAction(r.id);
                  if (!res.success) setError(res.message);
                  else router.refresh();
                });
              }}
            >
              Eliminar
            </Button>
          );
        },
      },
    ],
    [pending, router],
  );

  return (
    <div className="space-y-3" data-test-id="jornada-templates">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <DataGrid
        title="Plantillas de turno"
        rows={templates}
        columns={columns}
        headerActions={
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            Nueva plantilla
          </Button>
        }
      />
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva plantilla" size="sm">
        <div className="space-y-3">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Tipo"
            value={type}
            onChange={(id) => setType(String(id ?? "WEEKLY"))}
            options={Object.entries(TEMPLATE_TYPE_LABELS).map(([id, label]) => ({
              id,
              label,
            }))}
          />
          <Button
            variant="primary"
            disabled={!name.trim() || pending}
            onClick={() => {
              startTransition(async () => {
                const res = await createJornadaTemplateAction({
                  name: name.trim(),
                  type,
                });
                if (!res.success) {
                  setError(res.message);
                  return;
                }
                setOpen(false);
                setName("");
                router.refresh();
              });
            }}
          >
            Crear
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
