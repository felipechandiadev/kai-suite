"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateCareTemplateDialog } from "./CreateCareTemplateDialog";

export function CareTemplatesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear instrucción de cuidado"
        onClick={() => setOpen(true)}
        data-test-id="care-templates-collection-add"
      />
      <CreateCareTemplateDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
