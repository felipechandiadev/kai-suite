"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, IdCard, Mail, Phone, User as UserIcon } from "lucide-react";
import { Badge, Card, DeleteDialog } from "@kai/ui";
import type { UserListItem } from "@/features/settings-users/types/user.types";
import {
  appsAccessibleByRoles,
  effectiveRolesForUser,
  isOwnerInActiveCompany,
  roleLabel,
} from "@/features/settings-users/types/user.types";
import { deleteUserAction } from "@/features/settings-users/actions/user.action";
import { UpdateUserDialog } from "./UpdateUserDialog";

type UserCardProps = {
  user: UserListItem;
  "data-test-id"?: string;
};

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

  const sessionUserId = session?.user?.id;
  const isSelf = sessionUserId != null && String(sessionUserId) === String(user.id);
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null } | undefined)
    ?.activeCompanyId;

  const title = displayName(user);
  const sub = `@${user.userName}`;
  const roles = effectiveRolesForUser(user, activeCompanyId);
  const owner = isOwnerInActiveCompany(user, activeCompanyId);
  const apps = appsAccessibleByRoles(roles);
  const companyCount = user.memberships?.length ?? 0;
  const doc = (user.person?.documentNumber ?? "").trim();
  const phone = (user.person?.phone ?? "").trim();
  const docType = (user.person?.documentType ?? "RUT").trim() || "RUT";

  const headerEnd = (
    <span
      className="flex shrink-0 flex-wrap items-center justify-end gap-1.5"
      data-test-id="user-card-badges"
    >
      {owner ? (
        <Badge variant="warning-outlined" data-test-id="user-card-owner-badge">
          Dueño
        </Badge>
      ) : null}
      {roles.map((rol) => (
        <Badge key={rol} variant="info-outlined" data-test-id={`user-card-role-${rol}`}>
          {roleLabel(rol)}
        </Badge>
      ))}
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="user-card-media"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <UserIcon className="h-9 w-9 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  return (
    <>
      <Card
        className="h-full"
        fillHeight
        data-test-id={dataTestId}
        media={media}
        title={title}
        subtitle={sub}
        headerEnd={headerEnd}
        content={
          <div className="space-y-3 text-sm" data-test-id="user-card-details">
            <div className="flex min-w-0 items-start gap-2.5" data-test-id="user-card-mail">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 flex-1 break-words text-foreground">{user.mail}</span>
            </div>

            {doc ? (
              <div
                className="flex min-w-0 items-start gap-2.5"
                data-test-id="user-card-document"
              >
                <IdCard
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 break-words text-foreground">
                  <span className="text-muted-foreground">{docType} · </span>
                  {doc}
                </span>
              </div>
            ) : null}

            {phone ? (
              <div
                className="flex min-w-0 items-start gap-2.5"
                data-test-id="user-card-phone"
              >
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 break-words text-foreground">{phone}</span>
              </div>
            ) : null}

            {apps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5" data-test-id="user-card-apps">
                {apps.map((label) => (
                  <Badge key={label} variant="secondary-outlined">
                    {label}
                  </Badge>
                ))}
              </div>
            ) : null}

            {companyCount > 1 ? (
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                data-test-id="user-card-companies"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {companyCount} empresas
              </div>
            ) : null}
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
