"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { NextNavProvider } from "@kai/ui";

/**
 * Sesión explícita desde el layout servidor → hidrata `useSession` en el árbol (app).
 * Evita el error «useSession must be wrapped in SessionProvider» con Turbopack / RSC.
 */
export default function AppProviders({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <NextNavProvider>{children}</NextNavProvider>
    </SessionProvider>
  );
}
