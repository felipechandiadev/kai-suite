"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconButton } from "@kai/ui";
import { CollectionPageLayout } from "@kai/ui";
import type { SuperAdminUser } from "@/features/settings-users/types/super-admin.types";
import { SuperAdminCard } from "./SuperAdminCard";
import { CreateSuperAdminDialog } from "./CreateSuperAdminDialog";

type Props = {
  initialItems: SuperAdminUser[];
  currentUserId?: string | null;
};

export function SuperAdminsCollection({
  initialItems,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return initialItems;
    return initialItems.filter((u) => {
      const name = u.person?.name?.toLowerCase() ?? "";
      const fullName = [u.person?.firstName, u.person?.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        u.userName.toLowerCase().includes(q) ||
        u.mail.toLowerCase().includes(q) ||
        name.includes(q) ||
        fullName.includes(q)
      );
    });
  }, [initialItems, q]);

  return (
    <>
      <CollectionPageLayout
        title="Administradores globales"
        subtitle="Usuarios con rol SUPER_ADMIN: pueden gestionar todas las empresas del deploy y a otros super-administradores."
        addAction={
          <IconButton
            icon="Plus"
            variant="action"
            size="md"
            ariaLabel="Agregar super-administrador"
            onClick={() => setCreateOpen(true)}
            data-test-id="super-admins-collection-add"
          />
        }
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Buscar por usuario, email o nombre"
        contentEmptyMessage="No hay super-administradores que mostrar"
        contentItems={
          filtered.length > 0
            ? filtered.map((u) => (
                <SuperAdminCard
                  key={u.id}
                  user={u}
                  currentUserId={currentUserId}
                  data-test-id={`super-admin-card-${u.id}`}
                />
              ))
            : []
        }
        contentGridColumns={{ default: 1, md: 2, lg: 3 }}
        contentGridGapClassName="gap-4"
      />
      <CreateSuperAdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
