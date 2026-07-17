"use client";

import { useEffect, useState } from "react";
import { KdsQueuePanel } from "@/features/dining-kds/ui/KdsQueuePanel";
import { KdsUnitSelector } from "@/features/dining-kds/ui/KdsUnitSelector";
import {
  loadKdsProductionUnitId,
  loadKdsSession,
  type KdsSession,
} from "@/lib/app-session";

export default function QueuePage() {
  const [session, setSession] = useState<KdsSession | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);

  useEffect(() => {
    setSession(loadKdsSession());
    setUnitId(loadKdsProductionUnitId());
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-4" data-test-id="kds-queue-page">
      <KdsUnitSelector session={session} value={unitId} onChange={setUnitId} />
      <KdsQueuePanel session={session} productionUnitId={unitId} />
    </div>
  );
}
