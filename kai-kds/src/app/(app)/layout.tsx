"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KdsTopBar } from "@/shared/components/KdsTopBar";
import {
  KdsStationProvider,
  useKdsStation,
} from "@/features/dining-kds/station/kds-station-context";
import { KdsQueueRefreshProvider } from "@/features/dining-kds/station/kds-queue-refresh-context";
import { loadKdsSession, type KdsSession } from "@/lib/app-session";

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
    const current = loadKdsSession();
    setHydrated(true);
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
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
