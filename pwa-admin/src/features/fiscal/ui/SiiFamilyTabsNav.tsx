"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ButtonGroupToggle } from "@kai/ui";
import {
  FISCAL_DOCUMENT_FAMILY_META,
  type FiscalDocumentFamilies,
  type FiscalDocumentFamilyTab,
  resolveActiveFamilyTab,
} from "../types/fiscal-document-family";
import { siiCertificacionPath } from "@/navigation/sii-routes";

type Props = {
  families: FiscalDocumentFamilies;
};

export function SiiFamilyTabsNav({ families }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = useMemo(
    () => resolveActiveFamilyTab(tabParam, families),
    [tabParam, families],
  );

  const items = FISCAL_DOCUMENT_FAMILY_META.filter((m) => families[m.key]).map((m) => ({
    id: m.tab,
    label: m.label.replace(" electrónica", "").replace(" de crédito", " crédito"),
  }));

  if (items.length <= 1) {
    return null;
  }

  const basePath = pathname.replace(/\/$/, "") || pathname;

  return (
    <ButtonGroupToggle
      value={activeTab}
      onChange={(next) => {
        const url = `${basePath}?tab=${encodeURIComponent(next)}`;
        window.history.replaceState(null, "", url);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
      options={items.map((item) => ({
        id: item.id,
        label: item.label,
      }))}
      data-test-id="sii-family-tabs"
    />
  );
}

/** Server-friendly link tabs for cert/folios pages */
export function SiiFamilyTabsLinks({
  families,
  activeTab,
  basePath,
}: {
  families: FiscalDocumentFamilies;
  activeTab: FiscalDocumentFamilyTab;
  basePath: string;
}) {
  const items = FISCAL_DOCUMENT_FAMILY_META.filter((m) => families[m.key]);

  if (items.length <= 1) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap gap-2 border-b border-border pb-3"
      data-test-id="sii-family-tabs"
    >
      {items.map((m) => {
        const href =
          basePath === siiCertificacionPath().replace(/\?.*$/, "")
            ? siiCertificacionPath(m.tab)
            : `${basePath}?tab=${encodeURIComponent(m.tab)}`;
        const active = m.tab === activeTab;
        return (
          <Link
            key={m.tab}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {m.label.replace(" electrónica", "").replace(" de crédito", " crédito")}
          </Link>
        );
      })}
    </div>
  );
}
