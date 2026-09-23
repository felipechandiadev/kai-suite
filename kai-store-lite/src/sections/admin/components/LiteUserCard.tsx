import { Mail, Shield, UserRound } from "lucide-react";
import { Badge, Card } from "@kai/ui";
import type { LiteUser } from "@/lib/lite-api";

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
  "data-test-id"?: string;
};

export function LiteUserCard({ user, "data-test-id": dataTestId }: LiteUserCardProps) {
  const displayName = user.name?.trim() || user.userName || "Usuario";
  const email = user.email ?? user.mail ?? null;
  const roles = user.roles ?? [];

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
    <Card
      fillHeight
      className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
      data-test-id={dataTestId}
      media={media}
      title={displayName}
      subtitle={email ?? undefined}
      content={content}
    />
  );
}
