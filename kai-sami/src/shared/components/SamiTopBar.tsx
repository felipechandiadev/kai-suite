"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { getKaiProductLabel } from "@/config/product-brand.config";

export default function SamiTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const productLabel = getKaiProductLabel(process.env.NEXT_PUBLIC_KAI_PRODUCT);

  return (
    <header
      className="fixed top-0 z-30 flex h-[var(--app-topbar-height)] w-full border-b border-border bg-background"
      data-test-id="sami-top-bar"
    >
      <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-between gap-3 px-4">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2"
          onClick={() => router.push("/chat")}
        >
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-bold leading-none">{productLabel}</span>
            <span className="text-xs text-muted-foreground">SaMI</span>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <IconButton
            icon="MessageSquare"
            variant="action"
            size="md"
            ariaLabel="Chat"
            aria-current={pathname?.startsWith("/chat") ? "page" : undefined}
            onClick={() => router.push("/chat")}
          />
          <IconButton
            icon="History"
            variant="action"
            size="md"
            ariaLabel="Historial"
            aria-current={pathname?.startsWith("/history") ? "page" : undefined}
            onClick={() => router.push("/history")}
          />
          <IconButton
            icon="Settings"
            variant="action"
            size="md"
            ariaLabel="Ajustes"
            aria-current={pathname?.startsWith("/settings") ? "page" : undefined}
            onClick={() => router.push("/settings")}
          />
          <IconButton
            icon="LogOut"
            variant="action"
            size="md"
            ariaLabel="Salir"
            onClick={() => void signOut({ callbackUrl: "/" })}
          />
        </div>
      </div>
    </header>
  );
}
