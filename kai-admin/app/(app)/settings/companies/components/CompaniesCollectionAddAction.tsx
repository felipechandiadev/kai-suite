"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateCompanyDialog } from "./CreateCompanyDialog";

export function CompaniesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear empresa"
        onClick={() => setOpen(true)}
        data-test-id="companies-collection-add"
      />
      <CreateCompanyDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
