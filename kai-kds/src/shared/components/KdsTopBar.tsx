"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { clearKdsSession, type KdsSession } from "@/lib/app-session";

type KdsTopBarProps = {
  session: KdsSession;
};

export function KdsTopBar({ session }: KdsTopBarProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearKdsSession();
    router.replace("/login");
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-background"
      data-test-id="kds-top-bar"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2 sm:px-4">
        <img
          src="/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 object-contain"
          data-test-id="kds-top-bar-logo"
        />
        <div className="min-w-0 shrink leading-none">
          <p className="truncate text-base font-bold tracking-tight text-foreground">KaiFood</p>
          <p className="-mt-px truncate text-xs font-normal text-muted-foreground">KDS</p>
        </div>
        <div className="min-w-2 flex-1" aria-hidden />
        <span
          className="max-w-32 shrink-0 truncate text-sm font-medium text-muted-foreground"
          title={session.displayName || session.userName}
        >
          @{session.userName}
        </span>
        <IconButton
          icon="LogOut"
          variant="action"
          size="md"
          onClick={handleLogout}
          ariaLabel="Cerrar sesión"
          data-test-id="kds-logout-button"
        />
      </div>
    </header>
  );
}
