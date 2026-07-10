"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import {
  getCategoryDetailAction,
  updateCategoryAction,
} from "@/features/inventory-categories/actions/category.action";

export type UpdateCategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  category: CategoryListItem;
  allCategories: CategoryListItem[];
  onSuccess?: () => void | Promise<void>;
};

export function UpdateCategoryDialog({
  open,
  onClose,
  category,
  allCategories,
  onSuccess,
}: UpdateCategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingDetail, startLoadDetail] = useTransition();

  const parentOptions = useMemo(() => {
    const sorted = [...allCategories]
      .filter((c) => c.id !== category.id)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [
      { id: "", label: "Sin categoría padre" },
      ...sorted.map((c) => ({ id: c.id, label: c.name })),
    ];
  }, [allCategories, category.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setLoadError(null);
    startLoadDetail(() => {
      void (async () => {
        const r = await getCategoryDetailAction(category.id);
        if (r.success) {
          const d = r.category;
          setName(d.name);
          setDescription(d.description ?? "");
          setParentId(d.parentId ?? "");
          setSortOrder(d.sortOrder);
          setIsActive(d.isActive);
        } else {
          setLoadError(r.error);
          setName(category.name);
          setDescription("");
          setParentId(category.parentId ?? "");
          setSortOrder(0);
          setIsActive(true);
        }
      })();
    });
  }, [open, category.id, category.name, category.parentId]);

  const handleClose = () => {
    setError(null);
    setLoadError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateCategoryAction({
          id: category.id,
          name: name.trim(),
          description: description.trim() === "" ? null : description.trim(),
          parentId: parentId === "" ? null : parentId,
          sortOrder,
          isActive,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar categoría"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      data-test-id="category-update-dialog"
      alertArea={
        <>
          {loadError ? (
            <Alert variant="error" data-test-id="category-update-load-error">
              {loadError}
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="error" data-test-id="category-update-error">
              {error}
            </Alert>
          ) : null}
        </>
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="category-update-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending || isLoadingDetail}
            data-test-id="category-update-submit"
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="cat-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="category-update-name"
        />
        <TextField
          label="Descripción (opcional)"
          name="cat-update-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="category-update-description"
        />
        <Select
          label="Categoría padre"
          name="cat-update-parent"
          value={parentId}
          onChange={(id) => setParentId(id == null ? "" : String(id))}
          options={parentOptions}
          placeholder="Sin padre"
          data-test-id="category-update-parent"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Categoría activa"
            labelPosition="right"
            data-test-id="category-update-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
