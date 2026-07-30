"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateAttributeDialog } from "./CreateAttributeDialog";

export function AttributesCollectionAddAction() {
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
        data-test-id="attributes-collection-add"
      />
      <CreateAttributeDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
