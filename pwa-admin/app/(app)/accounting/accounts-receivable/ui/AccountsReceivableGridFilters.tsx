"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, type Option } from "@/shared/components/Select";
import { TextField } from "@/shared/components/TextField/TextField";
import Switch from "@/shared/components/Switch/Switch";

const STATUS_OPTIONS: Option[] = [
  { id: "", label: "Todos" },
  { id: "PENDING", label: "Pendiente" },
  { id: "PARTIAL", label: "Parcial" },
  { id: "OVERDUE", label: "Vencida" },
  { id: "PAID", label: "Cobrada" },
];

function parseBoolParam(value: string | null): boolean {
  const s = (value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

export default function AccountsReceivableGridFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const fromDate = searchParams.get("fromDate") ?? "";
  const toDate = searchParams.get("toDate") ?? "";
  const overdueOnly = parseBoolParam(searchParams.get("overdueOnly"));
  const includePaid = parseBoolParam(searchParams.get("includePaid"));

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.set("page", "1");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div
      className="flex flex-wrap items-end gap-2"
      data-test-id="accounts-receivable-grid-filters"
    >
      <div className="w-[140px]">
        <Select
          label="Estado"
          value={status || null}
          onChange={(id) => {
            replaceParams((params) => {
              const v = id == null ? "" : String(id);
              if (v) params.set("status", v);
              else params.delete("status");
            });
          }}
          options={STATUS_OPTIONS}
          placeholder="Todos"
          density="compact"
          labelLayout="inline"
          alwaysShowLabel
          data-test-id="ar-filter-status"
        />
      </div>
      <div className="w-[140px]">
        <TextField
          label="Desde"
          type="date"
          value={fromDate}
          onChange={(e) => {
            replaceParams((params) => {
              const v = e.target.value.trim();
              if (v) params.set("fromDate", v);
              else params.delete("fromDate");
            });
          }}
          density="compact"
          labelLayout="inline"
          alwaysShowLabel
          data-test-id="ar-filter-from-date"
        />
      </div>
      <div className="w-[140px]">
        <TextField
          label="Hasta"
          type="date"
          value={toDate}
          onChange={(e) => {
            replaceParams((params) => {
              const v = e.target.value.trim();
              if (v) params.set("toDate", v);
              else params.delete("toDate");
            });
          }}
          density="compact"
          labelLayout="inline"
          alwaysShowLabel
          data-test-id="ar-filter-to-date"
        />
      </div>
      <Switch
        checked={overdueOnly}
        onChange={(on) => {
          replaceParams((params) => {
            if (on) params.set("overdueOnly", "true");
            else params.delete("overdueOnly");
          });
        }}
        label="Solo vencidas"
        labelPosition="left"
        density="compact"
        data-test-id="ar-filter-overdue-only"
      />
      <Switch
        checked={includePaid}
        onChange={(on) => {
          replaceParams((params) => {
            if (on) params.set("includePaid", "true");
            else params.delete("includePaid");
          });
        }}
        label="Incluir cobradas"
        labelPosition="left"
        density="compact"
        data-test-id="ar-filter-include-paid"
      />
    </div>
  );
}
