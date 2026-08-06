"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { WaiterNotificationsBell } from "@/features/notifications/ui/WaiterNotificationsBell";
import { ensureWaiterWebPushSubscription } from "@/features/notifications/lib/web-push-subscribe";
import { clearWaiterSession, type WaiterSession } from "@/lib/app-session";
import ChangePasswordDialog from "@/shared/components/Dialog/ChangePasswordDialog";

type WaiterTopBarProps = {
  session: WaiterSession;
};

export function WaiterTopBar({ session }: WaiterTopBarProps) {
  const router = useRouter();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    void ensureWaiterWebPushSubscription({
      userId: session.userId,
      companyId: session.companyId,
    });
  }, [session.userId, session.companyId]);

  const handleLogout = () => {
    clearWaiterSession();
    router.replace("/login");
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full border-b border-border bg-background"
        data-test-id="waiter-top-bar"
      >
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-3 py-2 sm:px-4">
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 shrink-0 object-contain"
            data-test-id="waiter-top-bar-logo"
          />
          <div className="min-w-0 shrink leading-none">
            <p className="truncate text-base font-bold tracking-tight text-foreground">
              KaiFood
            </p>
            <p className="-mt-px truncate text-xs font-normal text-muted-foreground">
              Mesero
            </p>
          </div>
          <div className="min-w-2 flex-1" aria-hidden />
          <span
            className="max-w-28 shrink-0 truncate text-sm font-medium text-muted-foreground"
            title={session.displayName || session.userName}
          >
            @{session.userName}
          </span>
          <WaiterNotificationsBell session={session} />
          <IconButton
            icon="Printer"
            variant="action"
            size="md"
            onClick={() => router.push("/impresion")}
            ariaLabel="Impresión local"
            data-test-id="waiter-print-settings-button"
          />
          <IconButton
            icon="KeyRound"
            variant="action"
            size="md"
            onClick={() => setChangePasswordOpen(true)}
            ariaLabel="Cambiar contraseña"
            title="Cambiar contraseña"
            data-test-id="waiter-change-password-button"
          />
          <IconButton
            icon="LogOut"
            variant="action"
            size="md"
            onClick={handleLogout}
            ariaLabel="Cerrar sesión"
            data-test-id="waiter-logout-button"
          />
        </div>
      </header>
      <ChangePasswordDialog
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userId={session.userId}
        companyId={session.companyId}
      />
    </>
  );
}
