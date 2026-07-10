import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { TabPageLayout } from "@kai/ui";
import { SettingsCompaniesTabs } from "./SettingsCompaniesTabs";

export default async function SettingsCompaniesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  // Sección reservada a SUPER_ADMIN: ADMIN/OPERATOR la tienen oculta del
  // sidebar, pero protegemos también la URL directa.
  if (role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <TabPageLayout
      compact
      tabs={<SettingsCompaniesTabs />}
      className="min-h-0"
      headerClassName="pt-0"
      data-test-id="settings-companies-layout"
    >
      {children}
    </TabPageLayout>
  );
}
