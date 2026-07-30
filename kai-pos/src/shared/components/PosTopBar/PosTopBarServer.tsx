import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CompanyRequest } from "@/features/company/infrastructure/company.request";
import { FindMyOpenCashSessionUseCase } from "@/features/session/application/find-my-open-cash-session.usecase";
import PosTopBar from "./PosTopBar";
import { PosStockRealtimeProvider } from "@/features/inventory-stock/realtime/stock-realtime-context";

export default async function PosTopBarServer() {
  const session = await getServerSession(authOptions);
  const personName = session?.user?.name ?? null;
  const userRole = (session?.user as any)?.role ?? null;
  const stockUserId =
    ((session?.user as { accessToken?: string })?.accessToken as string | undefined) ||
    session?.user?.id ||
    null;
  const stockActiveCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;

  const openSession = await FindMyOpenCashSessionUseCase.execute();
  const pointOfSaleName =
    openSession.success ? openSession.pointOfSaleName : null;

  const company = await CompanyRequest.getDetails();
  const companyTradeName = company?.nombreFantasia ?? null;
  const companyKaiProduct = company?.kaiProduct ?? null;

  return (
    <PosStockRealtimeProvider userId={stockUserId} activeCompanyId={stockActiveCompanyId}>
      <PosTopBar
        pointOfSaleName={pointOfSaleName}
        companyTradeName={companyTradeName}
        companyKaiProduct={companyKaiProduct}
        personName={personName}
        userRole={userRole}
      />
    </PosStockRealtimeProvider>
  );
}

