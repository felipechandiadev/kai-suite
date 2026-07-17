import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { getDeliverySettingsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { CompanyProvider } from "@/providers/CompanyProvider";
import { isUnauthorizedSessionError } from "@/lib/auth/unauthorized-session";
import { SessionExpiredScreen } from "@/shared/components/SessionExpiredScreen";
import AppProviders from "./AppProviders";
import AppShellLayoutClient from "./AppShellLayoutClient";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;
  const hasToken = accessToken != null && String(accessToken).trim() !== "";

  let company = null;
  let sessionInvalid = false;

  if (hasToken) {
    try {
      company = await GetCompanyUseCase.execute();
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        sessionInvalid = true;
      }
    }
  }

  if (sessionInvalid) {
    return (
      <AppProviders session={session}>
        <SessionExpiredScreen autoRedirect />
      </AppProviders>
    );
  }

  let deliverySettingsRes: Awaited<ReturnType<typeof getDeliverySettingsAction>> | null = null;
  if (hasToken) {
    try {
      deliverySettingsRes = await getDeliverySettingsAction();
    } catch (e) {
      if (isUnauthorizedSessionError(e)) {
        return (
          <AppProviders session={session}>
            <SessionExpiredScreen autoRedirect />
          </AppProviders>
        );
      }
    }
  }
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
