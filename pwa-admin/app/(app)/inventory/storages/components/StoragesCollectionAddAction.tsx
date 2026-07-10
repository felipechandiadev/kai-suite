"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { CreateStorageDialog } from "./CreateStorageDialog";

type Props = {
  branches: BranchListItem[];
};

export function StoragesCollectionAddAction({ branches }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear almacén"
        onClick={() => setOpen(true)}
        data-test-id="storages-collection-add"
      />
      <CreateStorageDialog
        open={open}
        onClose={() => setOpen(false)}
        branches={branches}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
