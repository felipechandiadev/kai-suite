"use client";

import { useEffect, useState } from "react";
import { WaiterSalonWorkspace } from "@/features/dining-waiter/ui/WaiterSalonWorkspace";
import { loadWaiterSession, type WaiterSession } from "@/lib/app-session";

export default function SalonPage() {
  const [session, setSession] = useState<WaiterSession | null>(null);

  useEffect(() => {
    setSession(loadWaiterSession());
  }, []);

  if (!session) {
    return null;
  }

  return <WaiterSalonWorkspace session={session} />;
}
