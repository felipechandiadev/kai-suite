"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, AtSign } from "lucide-react";
import { Card } from "@kai/ui";
import { Badge } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import { deleteSuperAdminAction } from "@/features/settings-users/actions/super-admin.action";
import type { SuperAdminUser } from "@/features/settings-users/types/super-admin.types";

type SuperAdminCardProps = {
  user: SuperAdminUser;
  /**
   * Id del usuario actualmente logueado. Si coincide con `user.id` se
   * deshabilita la eliminación (no se permite auto-eliminación).
   */
  currentUserId?: string | null;
  "data-test-id"?: string;
};

export function SuperAdminCard({
  user,
  currentUserId,
  "data-test-id": dataTestId,
}: SuperAdminCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSelf = !!currentUserId && currentUserId === user.id;
  const isProtected = user.nonDeletable;
  const deleteDisabled = isSelf || isProtected;

  const personName =
    user.person?.name?.trim() ||
    [user.person?.firstName, user.person?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.userName;

  return (
    <>
      <Card
        data-test-id={dataTestId}
        media={
          <div
            className="flex min-h-24 w-full items-center justify-center bg-neutral-100"
            aria-hidden
          >
            <Shield className="h-10 w-10 text-muted" />
          </div>
        }
        title={personName}
        headerEnd={
          isProtected ? (
            <Badge variant="warning-outlined">Protegido</Badge>
          ) : isSelf ? (
            <Badge variant="info-outlined">Tú</Badge>
          ) : undefined
        }
        content={
          <div
            className="flex flex-col gap-2 text-sm"
            data-test-id="super-admin-card-details"
          >
            <div className="flex items-start gap-2.5">
              <AtSign
                className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 flex-1 break-words text-foreground">
                {user.userName}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 flex-1 break-words text-foreground">
                {user.mail || user.person?.email || "Sin email"}
              </span>
            </div>
          </div>
        }
        actions={[
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: isProtected
              ? "Super-administrador protegido"
              : isSelf
                ? "No puedes eliminar tu propia cuenta"
                : "Eliminar super-administrador",
            disabled: deleteDisabled || isDeleting,
            onClick: () => {
              if (deleteDisabled) return;
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
          },
        ]}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar super-administrador"
        message={
          <>
            ¿Eliminar al super-administrador{" "}
            <strong className="font-semibold">«{personName}»</strong>? Esta
            acción es irreversible.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteSuperAdminAction(user.id);
              if (r.success) {
                setDeleteOpen(false);
                router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "super-admin-card"}-delete-dialog`}
      />
    </>
  );
}
