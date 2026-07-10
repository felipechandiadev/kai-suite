import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { TabPageLayout } from "@kai/ui";
import { SiiSettingsNav } from "./SiiSettingsNav";

export default async function SiiSettingsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div
      className="w-full min-w-0 max-w-none space-y-6 p-4 pb-16"
      data-test-id="settings-sii-layout"
    >
      <TabPageLayout compact tabs={<SiiSettingsNav />} className="min-h-0" headerClassName="pt-0">
        {children}
      </TabPageLayout>
    </div>
  );
}
