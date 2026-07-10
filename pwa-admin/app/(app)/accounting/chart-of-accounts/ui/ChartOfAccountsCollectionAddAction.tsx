"use client";

import { useState } from "react";
import { Button } from "@kai/ui";
import type { AccountHierarchyNode } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";
import { CreateChartOfAccountDialog } from "./CreateChartOfAccountDialog";

export function ChartOfAccountsCollectionAddAction({ hierarchy }: { hierarchy: AccountHierarchyNode[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        aria-label="Crear cuenta"
        data-test-id="coa-create-open"
      >
        Crear cuenta
      </Button>
      <CreateChartOfAccountDialog open={open} onClose={() => setOpen(false)} hierarchy={hierarchy} />
    </>
  );
}

