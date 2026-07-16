"use client";

import { useMemo, useState } from "react";
import { AutoComplete, Button, IconButton, Select, Switch } from "@kai/ui";
import type { Option } from "@kai/ui";
import {
  activityRequiresOverrides,
  getActivityByCode,
  normalizeActiveEconomicActivities,
  searchEconomicActivities,
  type PersonEconomicActivity,
  type PersonEconomicActivityCategory,
  type SiiEconomicActivity,
} from "@kai/chile-catalogs";

type ActivityOption = SiiEconomicActivity & { id: string; label: string };

type Props = {
  activityStarted: boolean;
  onActivityStartedChange: (next: boolean) => void;
  value: PersonEconomicActivity[];
  onChange: (next: PersonEconomicActivity[]) => void;
  disabled?: boolean;
  testIdPrefix?: string;
};

const CATEGORY_OPTIONS: Option[] = [
  { id: "PRIMERA", label: "1ª categoría" },
  { id: "SEGUNDA", label: "2ª categoría" },
];

const IVA_OPTIONS: Option[] = [
  { id: "true", label: "Sí (afecto a IVA)" },
  { id: "false", label: "No (exento)" },
];

export function EconomicActivitiesEditor({
  activityStarted,
  onActivityStartedChange,
  value,
  onChange,
  disabled,
  testIdPrefix = "acteco",
}: Props) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<SiiEconomicActivity | null>(null);
  const [overrideCategory, setOverrideCategory] =
    useState<PersonEconomicActivityCategory>("PRIMERA");
  const [overrideIva, setOverrideIva] = useState(true);

  const editorDisabled = disabled || !activityStarted;

  const options = useMemo((): ActivityOption[] => {
    if (!activityStarted) return [];
    return searchEconomicActivities(query).map((a) => ({
      ...a,
      id: a.code,
      label: `${a.code} · ${a.name}`,
    }));
  }, [activityStarted, query]);

  const addActivity = (catalog: SiiEconomicActivity) => {
    if (value.some((v) => v.code === catalog.code)) {
      setPending(null);
      return;
    }
    const needs = activityRequiresOverrides(catalog.code);
    let category: PersonEconomicActivityCategory;
    let ivaAffected: boolean;
    if (needs) {
      category = overrideCategory;
      ivaAffected = overrideIva;
    } else {
      category = catalog.category === 2 ? "SEGUNDA" : "PRIMERA";
      ivaAffected = catalog.ivaAffected === true;
    }
    const next: PersonEconomicActivity = {
      code: catalog.code,
      name: catalog.name,
      category,
      ivaAffected,
      isActive: value.length === 0,
    };
    onChange(normalizeActiveEconomicActivities([...value, next]));
    setPending(null);
    setQuery("");
  };

  const onPick = (opt: ActivityOption | null) => {
    if (!opt || !activityStarted) return;
    const catalog = getActivityByCode(opt.code) ?? opt;
    if (activityRequiresOverrides(catalog.code)) {
      setPending(catalog);
      setOverrideCategory("PRIMERA");
      setOverrideIva(true);
      return;
    }
    addActivity(catalog);
  };

  const onToggleStarted = (next: boolean) => {
    onActivityStartedChange(next);
    if (!next) {
      onChange([]);
      setPending(null);
      setQuery("");
    }
  };

  return (
    <div className="grid gap-3" data-test-id={`${testIdPrefix}-editor`}>
      <Switch
        label="Inicio de actividades"
        checked={activityStarted}
        onChange={onToggleStarted}
        disabled={disabled}
        data-test-id={`${testIdPrefix}-started`}
      />

      <AutoComplete<ActivityOption>
        label="Actividad económica (SII)"
        placeholder={
          activityStarted ? "Buscar por código o glosa…" : "Active inicio de actividades"
        }
        options={options}
        value={null}
        onChange={onPick}
        onInputChange={setQuery}
        getOptionLabel={(o) => o.label}
        getOptionValue={(o) => o.id}
        alwaysShowLabel
        disabled={editorDisabled}
        data-test-id={`${testIdPrefix}-search`}
      />

      {pending && activityStarted ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3 grid gap-2">
          <p className="text-sm text-foreground">
            <span className="font-medium">{pending.code}</span> requiere definir
            categoría e IVA (marca G del SII).
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {pending.name}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              label="Categoría"
              options={CATEGORY_OPTIONS}
              value={overrideCategory}
              onChange={(v) =>
                setOverrideCategory(
                  (v != null ? String(v) : "PRIMERA") as PersonEconomicActivityCategory,
                )
              }
              alwaysShowLabel
              data-test-id={`${testIdPrefix}-g-category`}
            />
            <Select
              label="Afecto a IVA"
              options={IVA_OPTIONS}
              value={overrideIva ? "true" : "false"}
              onChange={(v) => setOverrideIva(String(v) === "true")}
              alwaysShowLabel
              data-test-id={`${testIdPrefix}-g-iva`}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPending(null)}
              disabled={editorDisabled}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => addActivity(pending)}
              disabled={editorDisabled}
              data-test-id={`${testIdPrefix}-g-confirm`}
            >
              Agregar
            </Button>
          </div>
        </div>
      ) : null}

      {activityStarted && value.length > 0 ? (
        <ul className="grid gap-2">
          {value.map((item) => (
            <li
              key={item.code}
              className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              data-test-id={`${testIdPrefix}-item-${item.code}`}
            >
              <input
                type="radio"
                name={`${testIdPrefix}-active`}
                checked={item.isActive}
                disabled={editorDisabled}
                onChange={() =>
                  onChange(
                    normalizeActiveEconomicActivities(
                      value.map((x) => ({
                        ...x,
                        isActive: x.code === item.code,
                      })),
                    ),
                  )
                }
                aria-label="Activa para DTE"
                className="mt-1"
                data-test-id={`${testIdPrefix}-active-${item.code}`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {item.code}
                  {item.isActive ? (
                    <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-300">
                      Activa (DTE)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.category === "PRIMERA" ? "1ª" : "2ª"} · IVA{" "}
                  {item.ivaAffected ? "Sí" : "No"}
                </p>
              </div>
              <IconButton
                icon="Trash2"
                variant="action"
                size="xs"
                ariaLabel="Quitar actividad"
                disabled={editorDisabled}
                onClick={() => {
                  const next = value.filter((x) => x.code !== item.code);
                  onChange(normalizeActiveEconomicActivities(next));
                }}
                data-test-id={`${testIdPrefix}-remove-${item.code}`}
              />
            </li>
          ))}
        </ul>
      ) : activityStarted ? (
        <p className="text-xs text-muted-foreground">
          Sin actividades. La marcada como activa se usará en documentos
          tributarios.
        </p>
      ) : null}
    </div>
  );
}
