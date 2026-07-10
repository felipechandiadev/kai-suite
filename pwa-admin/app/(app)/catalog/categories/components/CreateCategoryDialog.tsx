"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import { createCategoryAction } from "@/features/inventory-categories/actions/category.action";

export type CreateCategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  allCategories: CategoryListItem[];
};

export function CreateCategoryDialog({
  open,
  onClose,
  onSuccess,
  allCategories,
}: CreateCategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentOptions = useMemo(() => {
    const sorted = [...allCategories].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [
      { id: "", label: "Sin categoría padre" },
      ...sorted.map((c) => ({ id: c.id, label: c.name })),
    ];
  }, [allCategories]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setDescription("");
    setParentId("");
    setIsActive(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setParentId("");
    setIsActive(true);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createCategoryAction({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: parentId === "" ? "" : parentId,
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
      title="Crear categoría"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      data-test-id="category-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="category-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="category-create-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            data-test-id="category-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="cat-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="category-create-name"
        />
        <TextField
          label="Descripción (opcional)"
          name="cat-create-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="category-create-description"
        />
        <Select
          label="Categoría padre"
          name="cat-create-parent"
          value={parentId}
          onChange={(id) => setParentId(id == null ? "" : String(id))}
          options={parentOptions}
          placeholder="Sin padre"
          data-test-id="category-create-parent"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Categoría activa"
            labelPosition="right"
            data-test-id="category-create-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
