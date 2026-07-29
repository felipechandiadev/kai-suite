"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateLaundryAttributeDialog } from "./CreateLaundryAttributeDialog";

export function LaundryAttributesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear atributo"
        onClick={() => setOpen(true)}
        data-test-id="laundry-attributes-collection-add"
      />
      <CreateLaundryAttributeDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
