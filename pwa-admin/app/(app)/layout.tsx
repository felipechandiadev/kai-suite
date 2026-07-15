import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { getDeliverySettingsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { CompanyProvider } from "@/providers/CompanyProvider";
import AppProviders from "./AppProviders";
import AppShellLayoutClient from "./AppShellLayoutClient";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;
  const hasToken = accessToken != null && String(accessToken).trim() !== "";
  const company = hasToken ? await GetCompanyUseCase.execute() : null;
  const deliverySettingsRes = hasToken ? await getDeliverySettingsAction() : null;
  const localDeliveryEnabled =
    deliverySettingsRes?.success === true &&
    deliverySettingsRes.settings.localDeliveryEnabled === true;

  return (
    <AppProviders session={session}>
      <CompanyProvider
        initialCompany={company}
        localDeliveryEnabled={localDeliveryEnabled}
      >
        <AppShellLayoutClient>{children}</AppShellLayoutClient>
      </CompanyProvider>
    </AppProviders>
  );
}
