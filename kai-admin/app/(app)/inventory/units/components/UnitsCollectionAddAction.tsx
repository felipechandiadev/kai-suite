"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { CreateUnitDialog } from "./CreateUnitDialog";

type Props = {
  allUnits: UnitListItem[];
};

export function UnitsCollectionAddAction({ allUnits }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear unidad"
        onClick={() => setOpen(true)}
        data-test-id="units-collection-add"
      />
      <CreateUnitDialog
        open={open}
        onClose={() => setOpen(false)}
        allUnits={allUnits}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
