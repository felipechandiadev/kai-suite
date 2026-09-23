import { useMemo, useState } from "react";
import { FolderTree } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  DeleteDialog,
  Dialog,
  Select,
  TextField,
} from "@kai/ui";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi, type LiteCategoryRow } from "../api/lite-admin.api";

type LiteCategoryCardProps = {
  category: LiteCategoryRow;
  allCategories: LiteCategoryRow[];
  onUpdated: () => void;
  "data-test-id"?: string;
};

export function LiteCategoryCard({
  category,
  allCategories,
  onUpdated,
  "data-test-id": dataTestId,
}: LiteCategoryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  const parentName = useMemo(() => {
    if (!category.parentId) return null;
    return allCategories.find((c) => c.id === category.parentId)?.name ?? null;
  }, [allCategories, category.parentId]);

  const parentOptions = useMemo(
    () => [
      { id: "", label: "Sin categoría padre" },
      ...allCategories
        .filter((c) => c.id !== category.id)
        .map((c) => ({ id: c.id, label: c.name })),
    ],
    [allCategories, category.id],
  );

  function openEdit() {
    setName(category.name);
    setDescription(category.description ?? "");
    setParentId(category.parentId ?? "");
    setFormError(null);
    setEditOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.patchCategory(category.id, {
        name,
        description: description.trim() || null,
        parentId: parentId || null,
      });
      setEditOpen(false);
      onUpdated();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setDeleteErrors([]);
    try {
      await liteAdminApi.deleteCategory(category.id);
      setDeleteOpen(false);
      onUpdated();
    } catch (e) {
      setDeleteErrors([toUserMessage(e)]);
    } finally {
      setDeleting(false);
    }
  }

  const media = (
    <div className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15">
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md">
        <FolderTree className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const productLabel =
    (category.productCount ?? 0) === 1
      ? "1 producto"
      : `${category.productCount ?? 0} productos`;
  const childLabel =
    (category.childCount ?? 0) === 1
      ? "1 subcategoría"
      : `${category.childCount ?? 0} subcategorías`;

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={category.name}
        subtitle={parentName ? `Padre: ${parentName}` : "Raíz"}
        content={
          <p className="text-sm text-muted-foreground">
            {productLabel} · {childLabel}
          </p>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar categoría",
            onClick: openEdit,
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar categoría",
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
        title="Editar categoría"
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
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label="Categoría padre"
            options={parentOptions}
            value={parentId}
            onChange={(id) => setParentId(String(id))}
            alwaysShowLabel
          />
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
        title="Eliminar categoría"
        message={
          <>
            ¿Eliminar la categoría <strong className="font-semibold">«{category.name}»</strong>?
          </>
        }
        errors={deleteErrors}
        isSubmitting={deleting}
        onConfirm={() => void remove()}
      />
    </>
  );
}
