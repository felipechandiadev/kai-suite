import { useMemo, useState } from "react";
import { CollectionPageLayout } from "@kai/ui";
import type { LiteUser } from "@/lib/lite-api";
import { PageGate } from "@/shared/components/PageGate";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { CreateLiteUserDialog } from "../components/CreateLiteUserDialog";
import { LiteUserCard } from "../components/LiteUserCard";

export function UsersPage() {
  const q = useCollectionSearchQuery();
  const { items, loading, error, reload } = useLiteList<LiteUser>("/lite/users");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((r) => {
      const hay =
        `${r.name ?? ""} ${r.userName ?? ""} ${r.email ?? r.mail ?? ""} ${(r.roles ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q]);

  return (
    <PageGate roles={["OWNER", "ADMIN"]}>
      <CollectionPageLayout
        title="Usuarios"
        showSearch
        onAddClick={() => setCreateOpen(true)}
        addButtonAriaLabel="Crear usuario"
        contentEmptyMessage="Sin usuarios."
        contentItems={
          loading || error
            ? undefined
            : filtered.length > 0
              ? filtered.map((u) => (
                  <LiteUserCard
                    key={u.id}
                    user={u}
                    data-test-id={`user-card-${u.id}`}
                  />
                ))
              : []
        }
        contentGridColumns={3}
        contentGridGapClassName="gap-4"
        contentGridItemsAlign="stretch"
        data-test-id="users-page"
      >
        <LoadingLine loading={loading} />
        <CoreError message={error} />
      </CollectionPageLayout>

      <CreateLiteUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => reload()}
      />
    </PageGate>
  );
}
