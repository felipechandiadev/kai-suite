"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TabPageLayout } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { ShareholderRow } from "@/features/settings-shareholders/types/shareholder.types";
import { isEShopModuleEnabled } from "@/config/eshop-module.config";
import { CompanyGeneralSection } from "./CompanyGeneralSection";
import { CompanyBankAccountsSection } from "./CompanyBankAccountsSection";
import { CompanyPaymentMethodsSection } from "./CompanyPaymentMethodsSection";
import { CompanyInternalCustomerCreditSection } from "./CompanyInternalCustomerCreditSection";
import { CompanyDeferredPaymentSection } from "./CompanyDeferredPaymentSection";
import { CompanyChecksSection } from "./CompanyChecksSection";
import { CompanyQuotationsSection } from "./CompanyQuotationsSection";
import { CompanyPresalesSection } from "./CompanyPresalesSection";
import { CompanyPartnersSection } from "./CompanyPartnersSection";
import { CompanyPublicContactSection } from "./CompanyPublicContactSection";
import { CompanyIdentitySection } from "./CompanyIdentitySection";
import { CompanyEShopSection } from "./CompanyEShopSection";
import { CompanySettingsSectionNav } from "./CompanySettingsSectionNav";
import {
  COMPANY_SETTINGS_TABS,
  type CompanySettingsTabId,
  companySettingsTabFromHash,
} from "./company-settings-tabs.types";

type Props = {
  company: CompanyDetails;
  shareholders: ShareholderRow[];
};

export function CompanySettingsContent({ company, shareholders }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CompanySettingsTabId>("general");

  const visibleTabs = useMemo(
    () =>
      isEShopModuleEnabled()
        ? COMPANY_SETTINGS_TABS
        : COMPANY_SETTINGS_TABS.filter((t) => t.id !== "eshop"),
    [],
  );

  useEffect(() => {
    const fromHash = companySettingsTabFromHash(window.location.hash);
    if (fromHash && visibleTabs.some((t) => t.id === fromHash)) {
      setActiveTab(fromHash);
    }
  }, [visibleTabs]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab("general");
    }
  }, [activeTab, visibleTabs]);

  const selectTab = useCallback((id: CompanySettingsTabId) => {
    setActiveTab(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, []);

  const onSaved = useCallback(() => router.refresh(), [router]);

  if (!company.id) {
    return <CompanyGeneralSection company={company} onSaved={onSaved} />;
  }

  return (
    <TabPageLayout
      compact
      className="min-w-0 w-full max-w-none"
      contentClassName="min-w-0 w-full max-w-full pt-4"
      tabs={
        <CompanySettingsSectionNav tabs={visibleTabs} activeId={activeTab} onSelect={selectTab} />
      }
      data-test-id="settings-company-layout"
    >
      <div
        role="tabpanel"
        id={`company-settings-panel-${activeTab}`}
        aria-labelledby={`company-settings-tab-${activeTab}`}
        className="min-w-0 w-full"
        data-test-id={`settings-company-panel-${activeTab}`}
      >
        {activeTab === "general" ? (
          <CompanyGeneralSection company={company} onSaved={onSaved} />
        ) : null}

        {activeTab === "identidad" ? <CompanyIdentitySection company={company} /> : null}

        {activeTab === "bancos" ? <CompanyBankAccountsSection company={company} /> : null}
        {activeTab === "medios-pago" ? <CompanyPaymentMethodsSection companyId={company.id} /> : null}
        {activeTab === "credito-interno" ? (
          <div className="flex flex-col gap-6">
            <CompanyInternalCustomerCreditSection company={company} />
            <CompanyDeferredPaymentSection company={company} />
          </div>
        ) : null}
        {activeTab === "cheques" ? <CompanyChecksSection company={company} /> : null}
        {activeTab === "cotizaciones" ? <CompanyQuotationsSection company={company} /> : null}
        {activeTab === "preventa" ? <CompanyPresalesSection company={company} /> : null}
        {activeTab === "contacto" ? <CompanyPublicContactSection company={company} /> : null}
        {activeTab === "eshop" && isEShopModuleEnabled() ? (
          <CompanyEShopSection company={company} />
        ) : null}
        {activeTab === "socios" ? (
          <CompanyPartnersSection companyId={company.id} shareholders={shareholders} />
        ) : null}
      </div>
    </TabPageLayout>
  );
}
