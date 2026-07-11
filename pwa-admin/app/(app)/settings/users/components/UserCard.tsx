"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { Card } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { UserListItem } from "@/features/settings-users/types/user.types";
import { deleteUserAction } from "@/features/settings-users/actions/user.action";
import { UpdateUserDialog } from "./UpdateUserDialog";
import { USER_ROLE_OPTIONS } from "@/features/settings-users/types/user.types";

type UserCardProps = {
  user: UserListItem;
  "data-test-id"?: string;
};

function roleLabel(rol: string): string {
  const m = USER_ROLE_OPTIONS.find((o) => o.id === rol);
  return m?.label ?? rol;
}

function displayName(u: UserListItem): string {
  const p = [u.person?.firstName, u.person?.lastName]
    .filter((x) => x != null && String(x).trim() !== "")
    .map((x) => String(x).trim());
  if (p.length > 0) {
    return p.join(" ");
  }
  return u.userName;
}

export function UserCard({ user, "data-test-id": dataTestId }: UserCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const sessionUserId =
    session?.user?.accessToken ?? session?.user?.id;
  const isSelf = sessionUserId != null && String(sessionUserId) === String(user.id);
  const title = displayName(user);
  const sub = `@${user.userName}`;

  const media = (
    <div
      className="flex min-h-28 w-full items-center justify-center bg-neutral-100"
      data-test-id="user-card-media"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border">
        <UserIcon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      </div>
    </div>
  );

  return (
    <>
      <Card
        data-test-id={dataTestId}
        media={media}
        title={title}
        subtitle={sub}
        content={
          <div className="flex flex-col gap-2 text-sm" data-test-id="user-card-details">
            <p className="min-w-0 break-words text-foreground" data-test-id="user-card-mail">
              {user.mail}
            </p>
            <p className="text-muted-foreground" data-test-id="user-card-role">
              {roleLabel(user.rol === "USER" || user.rol === "MANAGER" ? "OPERATOR" : user.rol)}
            </p>
          </div>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar usuario",
            onClick: () => {
              setUpdateOpen(true);
            },
            "data-test-id": "user-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: isSelf ? "No podés eliminar tu propio usuario" : "Eliminar usuario",
            disabled: isDeleting || isSelf,
            onClick: () => {
              if (isSelf) {
                return;
              }
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "user-card-delete",
          },
        ]}
      />
      <UpdateUserDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        user={user}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar usuario"
        message={
          <>
            ¿Eliminar al usuario <strong className="font-semibold">«{title}»</strong> (
            {user.userName})? Esta acción no se puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteUserAction(user.id);
              if (r.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "user-card"}-delete-dialog`}
      />
    </>
  );
}
