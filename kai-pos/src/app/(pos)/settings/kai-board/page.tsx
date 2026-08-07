"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PosKaiBoardSettingsSection } from "@/features/dining-board/ui/PosKaiBoardSettingsSection";
import { isKaiFoodEnabledForPos } from "@/config/kaifood-module.config";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

export default function KaiBoardSettingsPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState("");
  const [allowed, setAllowed] = useState<"pending" | "yes" | "no">("pending");

  useEffect(() => {
    setBranchId(readPosContextClient()?.branchId?.trim() ?? "");
    let cancelled = false;
    void getCompanyDetailsAction()
      .then((details) => {
        if (cancelled) return;
        const ok = isKaiFoodEnabledForPos(
          details?.kaiProduct ?? null,
          readPosContextClient()?.kaiFoodEnabled,
        );
        if (!ok) {
          setAllowed("no");
          router.replace("/settings");
          return;
        }
        setAllowed("yes");
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed("no");
          router.replace("/settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed === "no") {
    return null;
  }

  if (allowed === "pending") {
    return (
      <p className="px-6 py-6 text-sm text-muted-foreground" data-test-id="pos-settings-kai-board-loading">
        Cargando…
      </p>
    );
  }

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
