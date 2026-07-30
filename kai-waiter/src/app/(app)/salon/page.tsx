"use client";

import { Suspense, useEffect, useState } from "react";
import { WaiterSalonWorkspace } from "@/features/dining-waiter/ui/WaiterSalonWorkspace";
import { loadWaiterSession, type WaiterSession } from "@/lib/app-session";

function SalonPageInner() {
  const [session, setSession] = useState<WaiterSession | null>(null);

  useEffect(() => {
    setSession(loadWaiterSession());
  }, []);

  if (!session) {
    return null;
  }

  return <WaiterSalonWorkspace session={session} />;
}

export default function SalonPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Cargando salón…
        </div>
      }
    >
      <SalonPageInner />
    </Suspense>
  );
}
