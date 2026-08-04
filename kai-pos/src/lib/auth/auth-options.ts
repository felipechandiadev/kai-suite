import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerBackendApiBase } from "@/lib/backend-api-url";

/** En dev cada app usa su propio origen (p. ej. :3032 vs admin :3031): las cookies ya no se mezclan. Nombres explícitos por si más adelante comparten host detrás de un proxy. */
const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  /** Permite login/logout desde IP LAN aunque NEXTAUTH_URL sea localhost en .env dev. */
  trustHost: true,
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session.kai-pos" : "next-auth.session.kai-pos",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        userName: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
        companyId: { label: "Company", type: "text" },
      },
      async authorize(credentials) {
        const url = `${getServerBackendApiBase()}/api/auth/login`;
        // La empresa se resuelve por prioridad:
        //   1. credentials.companyId  → enviado por LoginPage desde localStorage
        //      (configurado por el operario en /setup).
        //   2. NEXT_PUBLIC_COMPANY_ID → fallback legacy por env (deploy
        //      single-tenant atado a una empresa).
        //   3. COMPANY_ID             → mismo, server-side.
        // Si ninguna está presente, el backend devolverá la primera empresa
        // activa como activa por defecto.
        const companyId =
          (typeof credentials?.companyId === "string" && credentials.companyId.trim())
            ? credentials.companyId.trim()
            : process.env.NEXT_PUBLIC_COMPANY_ID ||
              process.env.COMPANY_ID ||
              null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (companyId) {
          headers["X-Active-Company-Id"] = companyId;
        }
        headers["X-Kai-App"] = "kai-pos";
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            userName: credentials?.userName,
            password: credentials?.password,
          }),
        });

        let data: Record<string, unknown> = {};
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch {
          data = {};
        }

        const backendMessage = (): string => {
          const raw = data.message;
          if (typeof raw === "string" && raw.trim()) return raw.trim();
          if (Array.isArray(raw)) {
            const parts = raw
              .filter((x): x is string => typeof x === "string")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            if (parts.length) return parts.join(" ");
          }
          if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
          return "";
        };

        if (!res.ok) {
          const msg = backendMessage();
          console.warn("[POS][auth] Login failed", {
            url,
            status: res.status,
            message: msg || null,
          });
          throw new Error(msg || "No se pudo iniciar sesión.");
        }

        if (!data.user || typeof data.user !== "object") {
          throw new Error("Credenciales inválidas");
        }

        const user = data.user as {
          id: string;
          userName: string;
          email: string;
          rol: string | null;
          companyId: string | null;
          person?: { firstName?: string; lastName?: string };
        };
        const userCompanyId = user.companyId ?? null;
        const role = user.rol ?? null;
        const backendActiveCompanyId =
          typeof data.activeCompanyId === "string" && data.activeCompanyId.trim()
            ? data.activeCompanyId.trim()
            : null;
        const memberships = Array.isArray(data.memberships)
          ? (data.memberships as Array<{ companyId?: string }>).filter(
              (m) => typeof m?.companyId === "string" && m.companyId.trim().length > 0,
            )
          : [];

        // Alineado a login.handler: SUPER_ADMIN o membership / activeCompany del hint.
        // No basta con user.companyId legacy (admin multiempresa tiene Store en legacy
        // y membership en Food).
        const belongsToPosCompany =
          !companyId ||
          role === "SUPER_ADMIN" ||
          userCompanyId === companyId ||
          backendActiveCompanyId === companyId ||
          memberships.some((m) => m.companyId === companyId);

        if (!belongsToPosCompany) {
          console.warn("[POS][auth] Usuario no pertenece a la empresa del POS", {
            role,
            userCompanyId,
            backendActiveCompanyId,
            membershipCompanyIds: memberships.map((m) => m.companyId),
            expected: companyId,
          });
          throw new Error(
            "Este usuario no pertenece a la empresa solicitada por este punto de venta",
          );
        }

        const activeCompanyId =
          role === "SUPER_ADMIN"
            ? companyId ?? backendActiveCompanyId
            : companyId ?? backendActiveCompanyId ?? userCompanyId;

        return {
          id: user.id,
          name:
            `${user.person?.firstName || ""} ${user.person?.lastName || ""}`.trim() || user.userName,
          email: user.email,
          userName: user.userName,
          accessToken: user.id,
          role,
          companyId: userCompanyId,
          activeCompanyId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.userName = (user as any).userName ?? null;
        token.role = (user as any).role ?? null;
        token.companyId = (user as any).companyId ?? null;
        token.activeCompanyId = (user as any).activeCompanyId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const backendUserId = (token.accessToken as string | undefined) || (token.sub as string | undefined);
      if (session.user) {
        if (backendUserId) session.user.id = backendUserId;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).userName =
          (token.userName as string | null | undefined) ?? undefined;
        (session.user as any).role = token.role ?? undefined;
        (session.user as any).companyId = token.companyId ?? null;
        (session.user as any).activeCompanyId = token.activeCompanyId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

