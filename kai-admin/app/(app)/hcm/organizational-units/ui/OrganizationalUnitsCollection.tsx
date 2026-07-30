"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Dialog,
  Select,
  Switch,
  TextField,
  type Option,
} from "@kai/ui";
import {
  createOrganizationalUnitAction,
  deactivateOrganizationalUnitAction,
  updateOrganizationalUnitAction,
} from "@/features/hr-organizational-units/actions/organizational-unit.action";
import type { OrganizationalUnitListItem } from "@/features/hr-organizational-units/types/organizational-unit.types";
import { HCM_SETTINGS_ORG_UNITS } from "@/navigation/hcm-routes";
import { LaborUnitAssociationsField } from "@/features/hr-labor-units/ui/LaborUnitAssociationsField";

const UNIT_TYPE_LABEL: Record<string, string> = {
  HEADQUARTERS: "Casa matriz",
  STORE: "Tienda",
  BACKOFFICE: "Backoffice",
  OPERATIONS: "Operaciones",
  SALES: "Ventas",
  OTHER: "Otro",
};

const UNIT_TYPE_OPTIONS: Option[] = Object.entries(UNIT_TYPE_LABEL).map(
  ([id, label]) => ({ id, label }),
);

type TreeNode = OrganizationalUnitListItem & { depth: number };

function buildTree(
  units: OrganizationalUnitListItem[],
  q: string,
): TreeNode[] {
  const byParent = new Map<string | null, OrganizationalUnitListItem[]>();
  for (const u of units) {
    const key = u.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(u);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  const out: TreeNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const u of byParent.get(parentId) ?? []) {
      const matches =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.description?.toLowerCase().includes(q) ?? false);
      const childStart = out.length;
      walk(u.id, depth + 1);
      const hasMatchingDescendant = out.length > childStart;
      if (matches || hasMatchingDescendant) {
        out.splice(childStart, 0, { ...u, depth });
      }
    }
  };
  walk(null, 0);

  // Orphans (parent missing from list)
  const ids = new Set(units.map((u) => u.id));
  for (const u of units) {
    if (u.parentId && !ids.has(u.parentId) && !out.some((x) => x.id === u.id)) {
      out.push({ ...u, depth: 0 });
    }
  }
  return out;
}

type Props = {
  initialUnits: OrganizationalUnitListItem[];
  includeInactive: boolean;
  embedded?: boolean;
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

type DialogMode =
  | { type: "create"; parentId: string | null }
  | { type: "edit"; unit: OrganizationalUnitListItem }
  | null;

export function OrganizationalUnitsCollection({
  initialUnits,
  includeInactive,
  embedded = false,
  laborUnits = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitType, setUnitType] = useState("OTHER");
  const [parentId, setParentId] = useState<string>("");
  const [laborUnitIds, setLaborUnitIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const tree = useMemo(() => buildTree(initialUnits, q), [initialUnits, q]);

  const parentOptions: Option[] = useMemo(
    () => [
      { id: "", label: "Sin padre (raíz)" },
      ...initialUnits
        .filter((u) => u.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((u) => ({ id: u.id, label: `${u.name} (${u.code})` })),
    ],
    [initialUnits],
  );

  const inactiveToggleHref = useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (includeInactive) p.delete("includeInactive");
    else p.set("includeInactive", "1");
    const qs = p.toString();
    return qs ? `${HCM_SETTINGS_ORG_UNITS}?${qs}` : HCM_SETTINGS_ORG_UNITS;
  }, [includeInactive, searchParams]);

  function openCreate(parent: string | null) {
    setError(null);
    setName("");
    setDescription("");
    setUnitType("OTHER");
    setParentId(parent ?? "");
    setLaborUnitIds([]);
    setIsActive(true);
    setDialog({ type: "create", parentId: parent });
  }

  function openEdit(unit: OrganizationalUnitListItem) {
    setError(null);
    setName(unit.name);
    setDescription(unit.description ?? "");
    setUnitType(unit.unitType);
    setParentId(unit.parentId ?? "");
    setLaborUnitIds(unit.laborUnitIds ?? []);
    setIsActive(unit.isActive !== false);
    setDialog({ type: "edit", unit });
  }

  function closeDialog() {
    setDialog(null);
    setError(null);
  }

  function save() {
    if (!name.trim()) {
      setError("Nombre requerido");
      return;
    }
    startTransition(async () => {
      if (dialog?.type === "create") {
        const res = await createOrganizationalUnitAction({
          name: name.trim(),
          description: description.trim() || null,
          unitType,
          parentId: parentId.trim() || null,
          laborUnitIds,
          isActive,
        });
        if (!res.success) {
          setError(res.message);
          return;
        }
      } else if (dialog?.type === "edit") {
        const res = await updateOrganizationalUnitAction(dialog.unit.id, {
          name: name.trim(),
          description: description.trim() || null,
          unitType,
          parentId: parentId.trim() || null,
          laborUnitIds,
          isActive,
        });
        if (!res.success) {
          setError(res.message);
          return;
        }
      }
      closeDialog();
      router.refresh();
    });
  }

  return (
    <div
      className="flex min-h-0 flex-col gap-3"
      data-test-id="organizational-units-collection"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!embedded ? (
          <h1 className="text-lg font-semibold text-foreground">
            Unidades organizativas
          </h1>
        ) : (
          <p className="text-sm text-muted-foreground">
            Jerarquía de unidades de la empresa.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!embedded ? (
            <Link
              href={inactiveToggleHref}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              data-test-id="org-units-toggle-inactive"
            >
              {includeInactive ? "Solo activas" : "Incluir inactivas"}
            </Link>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreate(null)}
            data-test-id="org-units-add-root"
          >
            Nueva raíz
          </Button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay unidades que mostrar</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {tree.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              style={{ paddingLeft: `${12 + u.depth * 20}px` }}
              data-test-id={`org-unit-row-${u.id}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-foreground">{u.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {u.code} · {UNIT_TYPE_LABEL[u.unitType] ?? u.unitType}
                  </span>
                  {u.isActive === false ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      Inactiva
                    </span>
                  ) : null}
                </div>
                {u.description ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {u.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => openCreate(u.id)}
                >
                  Hijo
                </Button>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => openEdit(u)}
                >
                  Editar
                </Button>
                {u.isActive !== false ? (
                  <Button
                    variant="outlined"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await deactivateOrganizationalUnitAction(
                          u.id,
                        );
                        if (!res.success) setError(res.message);
                        else router.refresh();
                      });
                    }}
                  >
                    Inactivar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialog != null}
        onClose={closeDialog}
        title={dialog?.type === "edit" ? "Editar unidad" : "Nueva unidad"}
        hideActions
        size="sm"
      >
        <div className="space-y-3 p-1">
          {error ? <Alert variant="error">{error}</Alert> : null}
          {dialog?.type === "edit" ? (
            <p className="text-xs text-muted-foreground">
              Código:{" "}
              <span className="font-medium">{dialog.unit.code}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              El código (UO#####) se asigna automáticamente al guardar.
            </p>
          )}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Tipo"
            options={UNIT_TYPE_OPTIONS}
            value={unitType}
            onChange={(id) => setUnitType(String(id ?? "OTHER"))}
          />
          <Select
            label="Unidad padre"
            options={parentOptions.filter(
              (o) =>
                dialog?.type !== "edit" || o.id !== dialog.unit.id,
            )}
            value={parentId}
            onChange={(id) => setParentId(id != null ? String(id) : "")}
          />
          <LaborUnitAssociationsField
            options={laborUnits}
            value={laborUnitIds}
            onChange={setLaborUnitIds}
            helperText="Opcional. Asociá unidades laborales a esta UO."
          />
          <TextField
            label="Descripción"
            type="textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onChange={setIsActive} />
            <span className="text-sm">Activa</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outlined" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={pending} onClick={save}>
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
