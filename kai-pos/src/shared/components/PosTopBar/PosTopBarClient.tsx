"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PosTopBar from "./PosTopBar";
import { PosStockRealtimeProvider } from "@/features/inventory-stock/realtime/stock-realtime-context";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { readCompanyCache } from "@/features/pos-offline/application/company-cache.usecase";
import { readSessionMeta, writeSessionMeta } from "@/features/pos-offline/application/session-meta.usecase";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { writeCompanyCache } from "@/features/pos-offline/application/company-cache.usecase";
import { isBackendReachable } from "@/features/pos-offline/infrastructure/connectivity";

export default function PosTopBarClient() {
  const { data: session } = useSession();
  const personName = session?.user?.name ?? null;
  const userRole = (session?.user as { role?: string | null })?.role ?? null;
  const stockUserId =
    ((session?.user as { accessToken?: string })?.accessToken as string | undefined) ||
    session?.user?.id ||
    null;
  const stockActiveCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;

  const [pointOfSaleName, setPointOfSaleName] = useState<string | null>(null);
  const [companyTradeName, setCompanyTradeName] = useState<string | null>(null);

  useEffect(() => {
    const ctx = readPosContextClient();
    setPointOfSaleName(ctx?.pointOfSaleName ?? null);

    void (async () => {
      const cachedSession = await readSessionMeta();
      if (cachedSession?.pointOfSaleName) {
        setPointOfSaleName(cachedSession.pointOfSaleName);
      }

      const cachedCompany = await readCompanyCache();
      if (cachedCompany?.tradeName) {
        setCompanyTradeName(cachedCompany.tradeName);
      }

      await writeSessionMeta({
        pointOfSaleName: ctx?.pointOfSaleName ?? cachedSession?.pointOfSaleName ?? null,
        userRole,
        personName,
      });

      if (!isBackendReachable()) return;
      const company = await getCompanyDetailsAction();
      if (company) {
        const trade = company.nombreFantasia ?? null;
        setCompanyTradeName(trade);
        await writeCompanyCache({
          tradeName: trade,
          legalName: company.razonSocial ?? null,
        });
      }
    })();
  }, [personName, userRole]);

  return (
    <PosStockRealtimeProvider userId={stockUserId} activeCompanyId={stockActiveCompanyId}>
      <PosTopBar
        pointOfSaleName={pointOfSaleName}
        companyTradeName={companyTradeName}
        personName={personName}
        userRole={userRole}
      />
    </PosStockRealtimeProvider>
  );
}
