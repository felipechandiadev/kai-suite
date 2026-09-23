import { useState } from "react";
import { Package, Tag, Warehouse } from "lucide-react";
import { Alert, Badge, Button, Card, Dialog, Switch, TextField } from "@kai/ui";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteStorageRow } from "../api/lite-admin.api";

type LiteStorageCardProps = {
  storage: LiteStorageRow;
  onUpdated: () => void;
  "data-test-id"?: string;
};

export function LiteStorageCard({
  storage,
  onUpdated,
  "data-test-id": dataTestId,
}: LiteStorageCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(storage.name);
  const [isDefault, setIsDefault] = useState(Boolean(storage.isDefault));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit() {
    setName(storage.name);
    setIsDefault(Boolean(storage.isDefault));
    setFormError(null);
    setEditOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.patchStorage(storage.id, {
        name,
        isDefault,
      });
      setEditOpen(false);
      onUpdated();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const headerEnd = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {storage.isDefault ? (
        <Badge variant="primary-outlined" className="text-[0.65rem]">
          Predeterminado
        </Badge>
      ) : null}
      <Badge variant={storage.isActive === false ? "secondary-outlined" : "success"}>
        {storage.isActive === false ? "Inactivo" : "Activo"}
      </Badge>
    </div>
  );

  const media = (
    <div className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15">
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md">
        <Package className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Warehouse className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Almacén
        </p>
        <p className="text-sm font-medium text-foreground">{storage.name}</p>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tag className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Tipo
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="info-outlined">{storage.type ?? "WAREHOUSE"}</Badge>
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
        title={storage.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar almacén",
            onClick: openEdit,
          },
        ]}
      />
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar almacén"
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
          <Switch
            label="Almacén por defecto"
            checked={isDefault}
            onChange={(checked) => setIsDefault(checked)}
          />
        </div>
      </Dialog>
    </>
  );
}
