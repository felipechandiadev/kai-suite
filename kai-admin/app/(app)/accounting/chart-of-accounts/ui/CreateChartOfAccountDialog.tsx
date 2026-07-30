"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { AccountHierarchyNode, AccountType } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";
import { createChartOfAccountAction } from "@/features/accounting-chart-of-accounts/actions/chart-of-accounts.action";

export type CreateChartOfAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  hierarchy: AccountHierarchyNode[];
};

const ACCOUNT_TYPE_OPTIONS: { id: AccountType; label: string }[] = [
  { id: "ASSET", label: "Activo" },
  { id: "LIABILITY", label: "Pasivo" },
  { id: "EQUITY", label: "Patrimonio" },
  { id: "INCOME", label: "Ingreso" },
  { id: "EXPENSE", label: "Gasto" },
];

function flatten(nodes: AccountHierarchyNode[], out: { id: string; label: string }[] = []): { id: string; label: string }[] {
  for (const n of nodes) {
    out.push({ id: n.id, label: `${n.code} ${n.name}` });
    if (n.children?.length) flatten(n.children, out);
  }
  return out;
}

export function CreateChartOfAccountDialog({ open, onClose, hierarchy }: CreateChartOfAccountDialogProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("ASSET");
  const [parentId, setParentId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentOptions = useMemo(() => {
    const opts = flatten(hierarchy);
    return [{ id: "", label: "Sin cuenta padre" }, ...opts];
  }, [hierarchy]);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setName("");
    setType("ASSET");
    setParentId("");
    setIsActive(true);
    setError(null);
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const canSubmit = code.trim() && name.trim() && !isPending;

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createChartOfAccountAction({
          code: code.trim(),
          name: name.trim(),
          type: type as any,
          parentId: parentId || null,
          isActive,
        });
        if (r.success) {
          router.refresh();
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
      title="Crear cuenta"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="coa-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="coa-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="coa-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="coa-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Código"
          name="coa-create-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código"
          required
          data-test-id="coa-create-code"
        />
        <TextField
          label="Nombre"
          name="coa-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="coa-create-name"
        />
        <Select
          label="Tipo"
          name="coa-create-type"
          value={type}
          onChange={(id) => setType(String(id) as AccountType)}
          options={ACCOUNT_TYPE_OPTIONS}
          required
          data-test-id="coa-create-type"
        />
        <Select
          label="Cuenta padre (opcional)"
          name="coa-create-parent"
          value={parentId}
          onChange={(id) => setParentId(String(id))}
          options={parentOptions}
          data-test-id="coa-create-parent"
        />
        <div className="pt-1">
          <Switch checked={isActive} onChange={setIsActive} label="Cuenta activa" labelPosition="right" data-test-id="coa-create-active" />
        </div>
      </div>
    </Dialog>
  );
}

