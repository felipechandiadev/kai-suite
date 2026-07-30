"use client";

import { useEffect, useState } from "react";
import { PosKaiBoardSettingsSection } from "@/features/dining-board/ui/PosKaiBoardSettingsSection";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

export default function KaiBoardSettingsPage() {
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    setBranchId(readPosContextClient()?.branchId?.trim() ?? "");
  }, []);

  return (
    <div
      className="mx-auto max-w-3xl space-y-6 px-6 py-6"
      data-test-id="pos-settings-kai-board-page"
    >
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Kai Board
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitores públicos de estado de pedidos (En preparación / Listos para
          retirar).
        </p>
      </header>
      {branchId ? (
        <PosKaiBoardSettingsSection branchId={branchId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Configure la caja / sucursal activa para gestionar pantallas Kai Board.
        </p>
      )}
    </div>
  );
}
