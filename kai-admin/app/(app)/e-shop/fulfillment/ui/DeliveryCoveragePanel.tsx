"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Switch, TextField } from "@kai/ui";
import { setDeliveryCommuneEnabledAction } from "@/features/e-shop-delivery/actions/delivery.action";
import type {
  DeliveryCommuneRow,
  MauleCommunesFeatureCollection,
} from "@/features/e-shop-delivery/types/delivery.types";
import { CoverageMapWrapper } from "./CoverageMapWrapper";

export function DeliveryCoveragePanel({
  initialCommunes,
}: {
  initialCommunes: DeliveryCommuneRow[];
}) {
  const router = useRouter();
  const [communes, setCommunes] = useState(initialCommunes);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [geojson, setGeojson] = useState<MauleCommunesFeatureCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    setCommunes(initialCommunes);
  }, [initialCommunes]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/geo/maule-communes.geojson")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MauleCommunesFeatureCollection>;
      })
      .then((data) => {
        if (!cancelled) setGeojson(data);
      })
      .catch(() => {
        if (!cancelled) setGeoError("No se pudo cargar el mapa de comunas del Maule.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledCodes = useMemo(
    () => new Set(communes.filter((c) => c.isEnabled).map((c) => c.code)),
    [communes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communes;
    return communes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q) ||
        c.code.includes(q),
    );
  }, [communes, query]);

  const byProvince = useMemo(() => {
    const map = new Map<string, DeliveryCommuneRow[]>();
    for (const c of filtered) {
      const list = map.get(c.province) ?? [];
      list.push(c);
      map.set(c.province, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [filtered]);

  function toggleEnabled(commune: DeliveryCommuneRow, next: boolean) {
    setBusyId(commune.id);
    setCommunes((prev) =>
      prev.map((c) => (c.id === commune.id ? { ...c, isEnabled: next } : c)),
    );
    void setDeliveryCommuneEnabledAction(commune.id, next)
      .then((res) => {
        if (!res.success) {
          setCommunes((prev) =>
            prev.map((c) => (c.id === commune.id ? { ...c, isEnabled: !next } : c)),
          );
        } else {
          router.refresh();
        }
      })
      .finally(() => setBusyId(null));
  }

  const enabledCount = communes.filter((c) => c.isEnabled).length;

  return (
    <div className="space-y-4" data-test-id="delivery-coverage-panel">
      <Alert variant="info">
        Región del Maule: habilita las comunas donde ofreces reparto local. El mapa muestra el área
        de cobertura seleccionada. Luego define tarifas en la pestaña Zonas.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-stretch">
        <aside
          className="flex h-[52vh] max-h-128 min-h-80 flex-col gap-3 rounded-xl border border-border p-3"
          data-test-id="coverage-communes-sidebar"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold">Comunas</p>
            <p className="text-xs text-muted-foreground">
              {enabledCount} de {communes.length} habilitadas
            </p>
          </div>

          <TextField
            label="Buscar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o provincia…"
          />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {byProvince.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              byProvince.map(([province, rows]) => (
                <section key={province} className="space-y-1.5">
                  <h3 className="sticky top-0 bg-background/95 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {province}
                  </h3>
                  <ul className="space-y-1">
                    {rows.map((c) => {
                      const selected = selectedCode === c.code;
                      return (
                        <li key={c.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedCode(c.code)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedCode(c.code);
                              }
                            }}
                            className={[
                              "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-transparent hover:bg-muted/50",
                            ].join(" ")}
                            data-test-id={`coverage-commune-row-${c.code}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{c.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{c.code}</p>
                            </div>
                            <div
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Switch
                                checked={c.isEnabled}
                                disabled={busyId === c.id}
                                onChange={(v) => toggleEnabled(c, v)}
                                density="compact"
                                data-test-id={`coverage-commune-switch-${c.code}`}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </aside>

        <div className="h-[52vh] max-h-128 min-h-80">
          {geoError ? (
            <Alert variant="error">{geoError}</Alert>
          ) : geojson ? (
            <CoverageMapWrapper
              communesGeoJson={geojson}
              enabledCodes={enabledCodes}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
              Cargando geometrías…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
