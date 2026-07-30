"use client";

import { FiscalEmissionsGridCore } from "./FiscalEmissionsGridCore";
import type { FiscalEmissionRow } from "../types/fiscal.types";

type Props = {
  initialItems: FiscalEmissionRow[];
  initialTotal: number;
};

export function FiscalEmissionsDataGrid({ initialItems, initialTotal }: Props) {
  return (
    <FiscalEmissionsGridCore
      initialItems={initialItems}
      initialTotal={initialTotal}
      showPackColumns
    />
  );
}
