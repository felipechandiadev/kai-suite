import type { Session } from "next-auth";

/** Login del backend (`users.userName`), no el nombre para mostrar. */
export function resolveSyncUserName(session: Session | null | undefined): string {
  return (session?.user as { userName?: string } | undefined)?.userName?.trim() || "";
}
