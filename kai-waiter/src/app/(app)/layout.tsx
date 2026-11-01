"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WaiterTopBar } from "@/shared/components/WaiterTopBar";
import {
  clearWaiterSession,
  loadWaiterSession,
  type WaiterSession,
} from "@/lib/app-session";
import { hasWaiterAuthAction } from "@/features/dining-waiter/actions/waiter.action";

export default function WaiterAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<WaiterSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const current = loadWaiterSession();
    if (!current) {
      setHydrated(true);
      router.replace("/login");
      return;
    }
    // localStorage es solo presentación: la sesión real es la cookie httpOnly firmada.
    void hasWaiterAuthAction()
      .catch(() => false)
      .then((ok) => {
        if (cancelled) return;
        setHydrated(true);
        if (!ok) {
          clearWaiterSession();
          router.replace("/login");
          return;
        }
        setSession(current);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!hydrated || !session) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background"
        data-test-id="waiter-app-loading"
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <WaiterTopBar session={session} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
