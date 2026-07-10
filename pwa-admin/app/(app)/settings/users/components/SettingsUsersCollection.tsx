"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { UserListItem } from "@/features/settings-users/types/user.types";
import { UsersCollectionAddAction } from "./UsersCollectionAddAction";
import { UserCard } from "./UserCard";

type SettingsUsersCollectionProps = {
  initialUsers: UserListItem[];
};

export function SettingsUsersCollection({ initialUsers }: SettingsUsersCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return initialUsers;
    }
    return initialUsers.filter((u) => {
      const name = [u.person?.firstName, u.person?.lastName]
        .filter((x) => x != null && String(x).trim() !== "")
        .join(" ")
        .toLowerCase();
      return (
        u.userName.toLowerCase().includes(q) ||
        u.mail.toLowerCase().includes(q) ||
        name.includes(q) ||
        u.rol.toLowerCase().includes(q)
      );
    });
  }, [initialUsers, q]);

  return (
    <CollectionPageLayout
      title="Usuarios"
      addAction={<UsersCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentEmptyMessage="No hay usuarios que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((u) => (
              <UserCard key={u.id} user={u} data-test-id={`user-card-${u.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      data-test-id="settings-users-collection"
    />
  );
}
