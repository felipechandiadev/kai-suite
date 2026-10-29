"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, type Option } from "@kai/ui";

type GridUrlSelectFilterProps = {
  /** Query param que guarda el valor (p. ej. `categoryId`). */
  param: string;
  label: string;
  options: Option[];
  /** Ancho mínimo del control (clase Tailwind). */
  className?: string;
  "data-test-id"?: string;
};

/**
 * Filtro de cabecera para grillas con paginación en servidor: escribe `param` en la URL y vuelve a la página 1.
 */
export function GridUrlSelectFilter({
  param,
  label,
  options,
  className = "min-w-44 max-w-xs",
  "data-test-id": dataTestId,
}: GridUrlSelectFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) || "";

  const apply = (value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(param, value);
    } else {
      next.delete(param);
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div className={className} data-test-id={dataTestId ? `${dataTestId}-wrapper` : undefined}>
      <Select
        label={label}
        name={`${param}-filter`}
        placeholder="Todos"
        options={options}
        value={current || null}
        onChange={(id) => apply(id == null ? null : String(id))}
        allowClear
        density="compact"
        labelLayout="inline"
        alwaysShowLabel
        data-test-id={dataTestId}
      />
    </div>
  );
}
