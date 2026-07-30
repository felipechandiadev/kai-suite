"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateGarmentTypeDialog } from "./CreateGarmentTypeDialog";

export function GarmentTypesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear tipo de prenda"
        onClick={() => setOpen(true)}
        data-test-id="garment-types-collection-add"
      />
      <CreateGarmentTypeDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
