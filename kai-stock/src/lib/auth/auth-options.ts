import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerBackendApiBase } from "@/lib/backend-api-url";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: isProd
        ? "__Secure-next-auth.session.kai-stock"
        : "next-auth.session.kai-stock",
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
        const companyId =
          typeof credentials?.companyId === "string" && credentials.companyId.trim()
            ? credentials.companyId.trim()
            : process.env.NEXT_PUBLIC_COMPANY_ID || process.env.COMPANY_ID || null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (companyId) {
          headers["X-Active-Company-Id"] = companyId;
        }
        headers["X-Kai-App"] = "kai-stock";
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
          throw new Error(backendMessage() || "No se pudo iniciar sesión.");
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

        if (companyId && role !== "SUPER_ADMIN" && userCompanyId !== companyId) {
          throw new Error("Este usuario no pertenece a la empresa configurada");
        }

        return {
          id: user.id,
          name:
            `${user.person?.firstName || ""} ${user.person?.lastName || ""}`.trim() ||
            user.userName,
          email: user.email,
          userName: user.userName,
          accessToken: user.id,
          role,
          companyId: userCompanyId,
          activeCompanyId: role === "SUPER_ADMIN" ? companyId : userCompanyId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.userName = (user as { userName?: string }).userName ?? null;
        token.role = (user as { role?: string }).role ?? undefined;
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.activeCompanyId =
          (user as { activeCompanyId?: string | null }).activeCompanyId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const backendUserId =
        (token.accessToken as string | undefined) || (token.sub as string | undefined);
      if (session.user) {
        if (backendUserId) session.user.id = backendUserId;
        (session.user as { accessToken?: string }).accessToken = token.accessToken as string;
        (session.user as { userName?: string }).userName =
          (token.userName as string | null | undefined) ?? undefined;
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { companyId?: string | null }).companyId =
          (token.companyId as string | null) ?? null;
        (session.user as { activeCompanyId?: string | null }).activeCompanyId =
          (token.activeCompanyId as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
