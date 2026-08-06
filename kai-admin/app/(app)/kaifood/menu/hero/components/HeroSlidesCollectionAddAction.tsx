"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CreateHeroSlideDialog } from "./CreateHeroSlideDialog";

export function HeroSlidesCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="action"
        size="md"
        ariaLabel="Crear slide del hero"
        onClick={() => setOpen(true)}
        data-test-id="hero-slides-collection-add"
      />
      <CreateHeroSlideDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
