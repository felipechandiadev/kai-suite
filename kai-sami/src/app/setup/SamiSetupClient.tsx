"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@kai/ui";
import type { PublicCompany } from "@/features/company/infrastructure/public-companies.request";
import { readSamiCompany, writeSamiCompany } from "@/features/company/storage/sami-company-storage";

export function SamiSetupClient({
  companies,
  initialError,
}: {
  companies: PublicCompany[];
  initialError?: string | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    const current = readSamiCompany();
    if (current?.id) setSelectedId(current.id);
  }, []);

  const sorted = useMemo(
    () =>
      [...companies].sort((a, b) =>
        (a.nombreFantasia ?? a.razonSocial).localeCompare(
          b.nombreFantasia ?? b.razonSocial,
        ),
      ),
    [companies],
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-10">
      <div className="flex items-center gap-2">
        <IconButton
          icon="ArrowLeft"
          variant="action"
          size="sm"
          onClick={() => router.push("/")}
          ariaLabel="Volver"
        />
        <h1 className="text-lg font-semibold">Empresa de SaMI</h1>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <ul className="flex flex-col gap-2">
        {sorted.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`w-full rounded-lg border px-3 py-2 text-left ${
                selectedId === c.id ? "border-primary" : "border-border"
              }`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="font-medium">{c.nombreFantasia || c.razonSocial}</div>
              <div className="text-xs text-muted-foreground">{c.razonSocial}</div>
            </button>
          </li>
        ))}
      </ul>
      <Button
        disabled={!selectedId || saving}
        loading={saving}
        onClick={() => {
          const target = sorted.find((c) => c.id === selectedId);
          if (!target) return;
          setSaving(true);
          try {
            writeSamiCompany(target);
            router.push("/");
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar");
          } finally {
            setSaving(false);
          }
        }}
      >
        Guardar
      </Button>
    </div>
  );
}
