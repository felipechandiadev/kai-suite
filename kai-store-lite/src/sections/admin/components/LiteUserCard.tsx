import { useState } from "react";
import { Mail, Shield, UserRound } from "lucide-react";
import { Badge, Card, DeleteDialog } from "@kai/ui";
import type { LiteUser } from "@/lib/lite-api";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  SUB_ADMIN: "Subadministrador",
  CASHIER: "Cajero",
  POS_OPERATOR: "Cajero",
  STOCK: "Inventario",
  STOCK_OPERATOR: "Inventario",
};

function roleLabel(code: string): string {
  const key = code.trim().toUpperCase();
  return ROLE_LABEL[key] ?? code;
}

type LiteUserCardProps = {
  user: LiteUser;
  onDeleted?: () => void;
  "data-test-id"?: string;
};

export function LiteUserCard({
  user,
  onDeleted,
  "data-test-id": dataTestId,
}: LiteUserCardProps) {
  const { user: me } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  const displayName = user.name?.trim() || user.userName || "Usuario";
  const email = user.email ?? user.mail ?? null;
  const roles = user.roles ?? [];
  const isOwner = roles.some((r) => r.trim().toUpperCase() === "OWNER");
  const isSelf = Boolean(me?.id && me.id === user.id);
  const canDelete = !isOwner && !isSelf;

  async function remove() {
    setDeleting(true);
    setDeleteErrors([]);
    try {
      await liteFetch(`/lite/users/${user.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      onDeleted?.();
    } catch (e) {
      setDeleteErrors([toUserMessage(e)]);
    } finally {
      setDeleting(false);
    }
  }

  const media = (
    <div className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15">
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md">
        <UserRound className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {user.userName ? (
        <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
            Usuario
          </p>
          <p className="font-mono text-sm font-medium text-foreground">{user.userName}</p>
        </div>
      ) : null}

      {email ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Email
          </p>
          <p className="break-all text-sm text-foreground">{email}</p>
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Shield className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Roles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {roles.length > 0 ? (
            roles.map((r) => (
              <Badge key={r} variant="primary-outlined" className="text-[0.65rem]">
                {roleLabel(r)}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Sin roles</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={displayName}
        subtitle={email ?? undefined}
        content={content}
        actions={
          canDelete
            ? [
                {
                  id: "delete",
                  icon: "Trash2",
                  ariaLabel: "Eliminar usuario",
                  disabled: deleting,
                  onClick: () => {
                    setDeleteErrors([]);
                    setDeleteOpen(true);
                  },
                },
              ]
            : undefined
        }
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar usuario"
        message={
          <>
            ¿Eliminar al usuario{" "}
            <strong className="font-semibold">«{displayName}»</strong>?
          </>
        }
        errors={deleteErrors}
        isSubmitting={deleting}
        onConfirm={() => void remove()}
      />
    </>
  );
}
