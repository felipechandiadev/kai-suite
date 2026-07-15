"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";

export type { CompanyDetails };

type CompanyContextValue = {
  company: CompanyDetails | null;
  /** Motor de reparto local (`delivery_settings.local_delivery_enabled`). */
  localDeliveryEnabled: boolean;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({
  children,
  initialCompany,
  localDeliveryEnabled = false,
}: {
  children: ReactNode;
  initialCompany: CompanyDetails | null;
  localDeliveryEnabled?: boolean;
}) {
  return (
    <CompanyContext.Provider
      value={{ company: initialCompany, localDeliveryEnabled }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (ctx == null) {
    throw new Error("useCompany debe usarse dentro de CompanyProvider");
  }
  return ctx;
}
