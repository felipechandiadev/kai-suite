"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KdsTopBar } from "@/shared/components/KdsTopBar";
import {
  KdsStationProvider,
  useKdsStation,
} from "@/features/dining-kds/station/kds-station-context";
import { KdsQueueRefreshProvider } from "@/features/dining-kds/station/kds-queue-refresh-context";
import { clearKdsSession, loadKdsSession, type KdsSession } from "@/lib/app-session";
import { hasKdsAuthAction } from "@/features/dining-kds/actions/kds.action";

function KdsAppChrome({ children }: { children: React.ReactNode }) {
  const { session, productionUnitLabel } = useKdsStation();

  return (
    <div className="kai-kds-app-chrome flex min-h-dvh flex-col text-foreground">
      <KdsTopBar session={session} productionUnitLabel={productionUnitLabel} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">{children}</main>
    </div>
  );
}

export default function KdsAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<KdsSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const current = loadKdsSession();
    if (!current) {
      setHydrated(true);
      router.replace("/login");
      return;
    }
    // localStorage es solo presentación: la sesión real es la cookie httpOnly firmada.
    void hasKdsAuthAction()
      .catch(() => false)
      .then((ok) => {
        if (cancelled) return;
        setHydrated(true);
        if (!ok) {
          clearKdsSession();
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
        className="kai-kds-app-chrome flex min-h-dvh items-center justify-center"
        data-test-id="kds-app-loading"
      />
    );
  }

  return (
    <KdsStationProvider session={session}>
      <KdsQueueRefreshProvider>
        <KdsAppChrome>{children}</KdsAppChrome>
      </KdsQueueRefreshProvider>
    </KdsStationProvider>
  );
}
