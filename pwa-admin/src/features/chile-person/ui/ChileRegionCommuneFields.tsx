"use client";

import { useMemo, useState } from "react";
import { AutoComplete, TextField } from "@kai/ui";
import {
  getCommuneByCode,
  getRegionByCode,
  listCommunesByRegion,
  listRegions,
  searchCommunes,
  type ChileCommune,
  type ChileRegion,
} from "@kai/chile-catalogs";

export type ChileGeoValue = {
  regionCode: string | null;
  regionName: string | null;
  communeCode: string | null;
  communeName: string | null;
  treasuryCode: string | null;
  address: string;
};

type RegionOption = ChileRegion & { id: string; label: string };
type CommuneOption = ChileCommune & { id: string; label: string };

type Props = {
  value: ChileGeoValue;
  onChange: (next: ChileGeoValue) => void;
  disabled?: boolean;
  testIdPrefix?: string;
};

export function ChileRegionCommuneFields({
  value,
  onChange,
  disabled,
  testIdPrefix = "chile-geo",
}: Props) {
  const [regionQuery, setRegionQuery] = useState("");
  const [communeQuery, setCommuneQuery] = useState("");

  const regionOptions = useMemo((): RegionOption[] => {
    const q = regionQuery.trim().toLowerCase();
    const all = listRegions().map((r) => ({
      ...r,
      id: r.code,
      label: `${r.code} · ${r.name}`,
    }));
    if (!q) return all;
    return all.filter(
      (r) =>
        r.code.includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q),
    );
  }, [regionQuery]);

  const selectedRegion: RegionOption | null = useMemo(() => {
    if (!value.regionCode) return null;
    const r = getRegionByCode(value.regionCode);
    if (!r) return null;
    return { ...r, id: r.code, label: `${r.code} · ${r.name}` };
  }, [value.regionCode]);

  const communeOptions = useMemo((): CommuneOption[] => {
    if (!value.regionCode) return [];
    const base = communeQuery.trim()
      ? searchCommunes(communeQuery, value.regionCode)
      : listCommunesByRegion(value.regionCode);
    return base.map((c) => ({
      ...c,
      id: c.communeCode,
      label: `${c.communeCode} · ${c.name}`,
    }));
  }, [value.regionCode, communeQuery]);

  const selectedCommune: CommuneOption | null = useMemo(() => {
    if (!value.communeCode) return null;
    const c = getCommuneByCode(value.communeCode);
    if (!c) return null;
    return { ...c, id: c.communeCode, label: `${c.communeCode} · ${c.name}` };
  }, [value.communeCode]);

  return (
    <div className="grid gap-3">
      <AutoComplete<RegionOption>
        label="Región"
        placeholder="Buscar región…"
        options={regionOptions}
        value={selectedRegion}
        onChange={(opt) => {
          onChange({
            ...value,
            regionCode: opt?.code ?? null,
            regionName: opt?.name ?? null,
            communeCode: null,
            communeName: null,
            treasuryCode: null,
          });
          setCommuneQuery("");
        }}
        onInputChange={setRegionQuery}
        getOptionLabel={(o) => o.label}
        getOptionValue={(o) => o.id}
        alwaysShowLabel
        disabled={disabled}
        data-test-id={`${testIdPrefix}-region`}
      />
      <AutoComplete<CommuneOption>
        label="Comuna"
        placeholder={
          value.regionCode ? "Buscar comuna…" : "Seleccione región primero"
        }
        options={communeOptions}
        value={selectedCommune}
        onChange={(opt) => {
          onChange({
            ...value,
            communeCode: opt?.communeCode ?? null,
            communeName: opt?.name ?? null,
            treasuryCode: opt?.treasuryCode ?? null,
            regionCode: opt?.regionCode ?? value.regionCode,
            regionName:
              opt != null
                ? getRegionByCode(opt.regionCode)?.name ?? value.regionName
                : value.regionName,
          });
        }}
        onInputChange={setCommuneQuery}
        getOptionLabel={(o) => o.label}
        getOptionValue={(o) => o.id}
        alwaysShowLabel
        disabled={disabled || !value.regionCode}
        data-test-id={`${testIdPrefix}-commune`}
      />
      <TextField
        label="Dirección (calle y número)"
        name={`${testIdPrefix}-address`}
        value={value.address ?? ""}
        onChange={(e) =>
          onChange({ ...value, address: (e.target as HTMLInputElement).value })
        }
        disabled={disabled}
        data-test-id={`${testIdPrefix}-address`}
      />
    </div>
  );
}
