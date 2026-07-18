"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateUserDialog } from "./CreateUserDialog";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

export function UsersCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    void listBranchesForSettingsPage().then(setBranches);
  }, []);

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear usuario"
        onClick={() => setOpen(true)}
        data-test-id="users-collection-add"
      />
      <CreateUserDialog
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
