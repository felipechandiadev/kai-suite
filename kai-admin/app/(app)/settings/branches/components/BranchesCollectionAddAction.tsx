"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateBranchDialog } from "./CreateBranchDialog";

type Props = {
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

export function BranchesCollectionAddAction({ laborUnits = [] }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear sucursal"
        onClick={() => setOpen(true)}
        data-test-id="branches-collection-add"
      />
      <CreateBranchDialog
        open={open}
        onClose={() => setOpen(false)}
        laborUnits={laborUnits}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
