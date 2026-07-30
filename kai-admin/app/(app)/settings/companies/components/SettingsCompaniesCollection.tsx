"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { CompanyDetail } from "@/features/companies/types/company.types";
import { CompaniesCollectionAddAction } from "./CompaniesCollectionAddAction";
import { CompanyCard } from "./CompanyCard";

type Props = {
  initialCompanies: CompanyDetail[];
};

export function SettingsCompaniesCollection({ initialCompanies }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialCompanies;
    return initialCompanies.filter(
      (c) =>
        c.razonSocial.toLowerCase().includes(q) ||
        (c.nombreFantasia && c.nombreFantasia.toLowerCase().includes(q)) ||
        c.rut.toLowerCase().includes(q),
    );
  }, [initialCompanies, q]);

  return (
    <CollectionPageLayout
      title="Empresas"
      addAction={<CompaniesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar por razón social, nombre de fantasía o RUT"
      contentEmptyMessage="No hay empresas que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((c) => (
              <CompanyCard
                key={c.id}
                company={c}
                data-test-id={`company-card-${c.id}`}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
    />
  );
}
