import { useState } from "react";
import { Hash, Ruler, Tags } from "lucide-react";
import { Alert, Badge, Button, Card, Dialog, TextField, Select } from "@kai/ui";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteUnitRow } from "../api/lite-admin.api";

const DIMENSION_LABELS: Record<string, string> = {
  count: "Conteo",
  mass: "Masa",
  volume: "Volumen",
  length: "Longitud",
};

const DIMENSION_OPTIONS = [
  { id: "count", label: "count" },
  { id: "mass", label: "mass" },
  { id: "volume", label: "volume" },
  { id: "length", label: "length" },
];

type LiteUnitCardProps = {
  unit: LiteUnitRow;
  onUpdated: () => void;
  "data-test-id"?: string;
};

export function LiteUnitCard({
  unit,
  onUpdated,
  "data-test-id": dataTestId,
}: LiteUnitCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(unit.name);
  const [symbol, setSymbol] = useState(unit.symbol);
  const [dimension, setDimension] = useState(unit.dimension);
  const [factor, setFactor] = useState(String(unit.conversionFactor));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit() {
    setName(unit.name);
    setSymbol(unit.symbol);
    setDimension(unit.dimension);
    setFactor(String(unit.conversionFactor));
    setFormError(null);
    setEditOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.patchUnit(unit.id, {
        name,
        symbol,
        dimension,
        conversionFactor: Number(factor) || 1,
      });
      setEditOpen(false);
      onUpdated();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const dimLabel = DIMENSION_LABELS[unit.dimension] ?? unit.dimension;

  const media = (
    <div className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15">
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md">
        <Ruler className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Ruler className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Conversión
        </p>
        <p className="text-sm font-medium text-foreground">
          Factor {unit.conversionFactor}
        </p>
      </div>
      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Símbolo
        </p>
        <p className="font-mono text-sm font-medium text-foreground">{unit.symbol}</p>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tags className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Detalles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {unit.isBase ? <Badge variant="primary">Base</Badge> : null}
          <Badge variant="warning-outlined">{dimLabel}</Badge>
        </div>
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
        title={unit.name}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar unidad",
            onClick: openEdit,
          },
        ]}
      />
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar unidad"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" loading={busy} onClick={() => void save()}>
              Guardar
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Símbolo" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <Select
            label="Dimensión"
            options={DIMENSION_OPTIONS}
            value={dimension}
            onChange={(id) => setDimension(String(id))}
            alwaysShowLabel
          />
          <TextField
            label="Factor de conversión"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            type="number"
          />
        </div>
      </Dialog>
    </>
  );
}
