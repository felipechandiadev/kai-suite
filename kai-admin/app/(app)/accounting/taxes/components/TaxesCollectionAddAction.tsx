"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateTaxDialog } from "./CreateTaxDialog";

export function TaxesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear impuesto"
        onClick={() => setOpen(true)}
        data-test-id="taxes-collection-add"
      />
      <CreateTaxDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
