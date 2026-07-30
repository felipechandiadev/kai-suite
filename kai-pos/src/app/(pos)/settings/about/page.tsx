"use client";

import { KaiAppAboutPanel } from "@kai-shared/kai-app-about/KaiAppAboutPanel";
import { usePrintServiceConnection } from "@kai/print-service-client";

export default function PosAboutPage() {
  const { connected, health } = usePrintServiceConnection({ clientId: "kai-pos" });

  return (
    <div className="mx-auto max-w-lg space-y-4 px-6 py-6" data-test-id="pos-about-page">
      <h1 className="text-xl font-semibold">Acerca de</h1>
      <KaiAppAboutPanel
        appName="KaiStore POS"
        productLabel="KaiStore"
        printAgentConnected={connected}
        printAgentVersion={health?.version ?? null}
      />
    </div>
  );
}
