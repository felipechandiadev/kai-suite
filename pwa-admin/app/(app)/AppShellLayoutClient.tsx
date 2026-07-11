"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import TopBar from "@/shared/components/TopBar/TopBar";
import ChangePasswordDialog from "@/shared/components/Dialog/ChangePasswordDialog";
import { mainMenuItems } from "@/navigation/mainMenu";
import { useCompany } from "@/providers/CompanyProvider";
import { NotificationsRealtimeProvider } from "@/features/notifications/realtime/notifications-realtime-context";

export default function AppShellLayoutClient({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { company } = useCompany();

  const companyTradeName =
    company?.nombreFantasia != null && String(company.nombreFantasia).trim() !== ""
      ? String(company.nombreFantasia).trim()
      : null;

  const adminCompanySwitcherFallback =
    session?.user?.role === "ADMIN" && company
      ? companyTradeName ||
        (company.razonSocial != null && String(company.razonSocial).trim() !== ""
          ? String(company.razonSocial).trim()
          : null)
      : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <NotificationsRealtimeProvider>
      <div className="flex h-screen overflow-hidden flex-col">
        <TopBar
        title="KaiStore"
        companyTradeName={companyTradeName}
        companySwitcherFallbackLabel={adminCompanySwitcherFallback}
        subtitle="Administración"
        logoSrc="/logo.png"
        menuItems={mainMenuItems}
        onOpenChangePassword={() => setIsDialogOpen(true)}
      />
      <main className="flex-1 overflow-auto px-6 pb-6 pt-[calc(var(--app-topbar-height)+1rem)] md:px-10">
        {children}
      </main>
      <ChangePasswordDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
    </NotificationsRealtimeProvider>
  );
}
