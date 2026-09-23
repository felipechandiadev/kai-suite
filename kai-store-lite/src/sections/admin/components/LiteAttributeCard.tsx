import { useEffect, useState } from "react";
import { FileText, ListChecks, Tags } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  DeleteDialog,
  Dialog,
  IconButton,
  Switch,
  TextField,
} from "@kai/ui";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteAttributeRow } from "../api/lite-admin.api";

const OPTION_PREVIEW = 8;

type LiteAttributeCardProps = {
  attribute: LiteAttributeRow;
  onUpdated: () => void;
  "data-test-id"?: string;
};

export function LiteAttributeCard({
  attribute,
  onUpdated,
  "data-test-id": dataTestId,
}: LiteAttributeCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(attribute.name);
  const [description, setDescription] = useState(attribute.description ?? "");
  const [options, setOptions] = useState<string[]>([...attribute.options]);
  const [newOption, setNewOption] = useState("");
  const [active, setActive] = useState(attribute.isActive);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  useEffect(() => {
    setActive(attribute.isActive);
  }, [attribute.isActive, attribute.id]);

  function openEdit() {
    setName(attribute.name);
    setDescription(attribute.description ?? "");
    setOptions([...attribute.options]);
    setNewOption("");
    setFormError(null);
    setEditOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.patchAttribute(attribute.id, {
        name,
        description: description.trim() || null,
        options,
        isActive: active,
      });
      setEditOpen(false);
      onUpdated();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(next: boolean) {
    setActiveError(null);
    const prev = active;
    setActive(next);
    setToggling(true);
    try {
      await liteAdminApi.patchAttribute(attribute.id, { isActive: next });
      onUpdated();
    } catch (e) {
      setActive(prev);
      setActiveError(toUserMessage(e));
    } finally {
      setToggling(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setDeleteErrors([]);
    try {
      await liteAdminApi.deleteAttribute(attribute.id);
      setDeleteOpen(false);
      onUpdated();
    } catch (e) {
      setDeleteErrors([toUserMessage(e)]);
    } finally {
      setDeleting(false);
    }
  }

  const preview = attribute.options.slice(0, OPTION_PREVIEW);
  const rest = Math.max(0, attribute.options.length - preview.length);

  const media = (
    <div className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15">
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md">
        <ListChecks className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Descripción
        </p>
        <p className="text-sm font-medium leading-snug text-foreground">
          {attribute.description?.trim() ? attribute.description.trim() : "Sin descripción"}
        </p>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tags className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Opciones ({attribute.options.length})
        </p>
        {attribute.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin opciones</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {preview.map((opt, i) => (
              <Badge key={`${attribute.id}-opt-${i}`} variant="info-outlined" className="max-w-full truncate">
                {opt}
              </Badge>
            ))}
            {rest > 0 ? <Badge variant="secondary-outlined">+{rest} más</Badge> : null}
          </div>
        )}
      </div>
      {activeError ? (
        <p className="text-sm text-red-600" role="alert">
          {activeError}
        </p>
      ) : null}
      <div className="mt-auto">
        <Switch
          checked={active}
          disabled={toggling}
          onChange={(v) => void toggleActive(v)}
          label="Activo en catálogo"
          labelPosition="right"
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
        title={attribute.name}
        headerEnd={
          <Badge variant={attribute.isActive ? "success" : "secondary-outlined"}>
            {attribute.isActive ? "Activo" : "Inactivo"}
          </Badge>
        }
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar atributo",
            onClick: openEdit,
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar atributo",
            disabled: deleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
          },
        ]}
      />
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar atributo"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={!name.trim()}
              onClick={() => void save()}
            >
              Guardar
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Opciones</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt, i) => (
                <span key={`${opt}-${i}`} className="inline-flex items-center gap-1">
                  <Badge variant="info-outlined">{opt}</Badge>
                  <IconButton
                    icon="X"
                    ariaLabel={`Quitar ${opt}`}
                    size="sm"
                    variant="text"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  />
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <TextField
                label="Nueva opción"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = newOption.trim();
                    if (trimmed && !options.includes(trimmed)) {
                      setOptions([...options, trimmed]);
                      setNewOption("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outlined"
                className="shrink-0 self-end"
                onClick={() => {
                  const trimmed = newOption.trim();
                  if (trimmed && !options.includes(trimmed)) {
                    setOptions([...options, trimmed]);
                    setNewOption("");
                  }
                }}
              >
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar atributo"
        message={
          <>
            ¿Eliminar el atributo <strong className="font-semibold">«{attribute.name}»</strong>?
          </>
        }
        errors={deleteErrors}
        isSubmitting={deleting}
        onConfirm={() => void remove()}
      />
    </>
  );
}
