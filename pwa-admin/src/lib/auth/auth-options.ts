import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

function resolveBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (!base) {
    throw new Error(
      'BACKEND_API_URL no está definida (servidor Next). En red local use la IP del host, p. ej. http://192.168.1.10:3001',
    );
  }
  return base.replace(/\/$/, '');
}

/** En dev cada app usa su propio origen (p. ej. :3031 vs :3032): las cookies ya no se mezclan. Nombres explícitos por si más adelante comparten host detrás de un proxy. */
const isProd = process.env.NODE_ENV === 'production';

export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session.kai-admin' : 'next-auth.session.kai-admin',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        userName: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
        companyId: { label: 'Empresa', type: 'text' },
        multiCompanyMode: { label: 'Multiempresa', type: 'text' },
      },
      async authorize(credentials) {
        const companyId =
          typeof credentials?.companyId === 'string' &&
          credentials.companyId.trim() &&
          credentials.companyId !== 'null'
            ? credentials.companyId.trim()
            : null;
        const multiCompanyMode =
          credentials?.multiCompanyMode === 'true' ||
          credentials?.multiCompanyMode === '1';

        if (!companyId && !multiCompanyMode) {
          throw new Error(
            'Debes elegir empresa o Multiempresa con la tuerca',
          );
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Kai-App': 'pwa-admin',
        };
        if (companyId && !multiCompanyMode) {
          headers['X-Active-Company-Id'] = companyId;
        }

        const res = await fetch(`${resolveBackendApiBase()}/api/auth/login`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userName: credentials?.userName,
            password: credentials?.password,
            ...(multiCompanyMode ? { multiCompanyMode: true } : {}),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data?.message === 'string'
              ? data.message
              : Array.isArray(data?.message)
                ? String(data.message[0])
                : res.status === 401
                  ? 'Credenciales inválidas'
                  : 'No se pudo iniciar sesión';
          console.error('[auth] login backend falló:', res.status, msg);
          throw new Error(msg);
        }
        if (data.user) {
          return {
            id: data.user.id,
            name: `${data.user.person?.firstName || ''} ${data.user.person?.lastName || ''}`.trim() || data.user.userName,
            email: data.user.email,
            accessToken: data.user.id,
            role: data.user.rol ?? null,
            companyId: data.user.companyId ?? null,
            activeCompanyId: data.activeCompanyId ?? data.user.companyId ?? null,
            multiCompanyMode: !!data.multiCompanyMode,
            memberships: Array.isArray(data.memberships) ? data.memberships : [],
            companies: Array.isArray(data.companies) ? data.companies : null,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = (user as any).role ?? null;
        token.companyId = (user as any).companyId ?? null;
        token.activeCompanyId = (user as any).activeCompanyId ?? null;
        token.multiCompanyMode = (user as any).multiCompanyMode ?? false;
        token.memberships = (user as any).memberships ?? [];
        token.companies = (user as any).companies ?? null;
      }
      if (trigger === 'update' && session?.activeCompanyId !== undefined) {
        token.activeCompanyId = session.activeCompanyId ?? null;
      }
      if (trigger === 'update' && session?.multiCompanyMode !== undefined) {
        token.multiCompanyMode = !!session.multiCompanyMode;
        if (session.multiCompanyMode) {
          token.activeCompanyId = null;
        }
      }
      if (trigger === 'update' && session?.companies !== undefined) {
        token.companies = session.companies ?? null;
      }
      if (trigger === 'update' && session?.memberships !== undefined) {
        token.memberships = session.memberships ?? [];
      }
      return token;
    },
    session: async ({ session, token }) => {
      const backendUserId = (token.accessToken as string | undefined) ||
        (token.sub as string | undefined);
      if (backendUserId) {
        session.user.id = backendUserId;
      }
      session.user.accessToken = token.accessToken;
      session.user.role = token.role ?? null;
      session.user.companyId = token.companyId ?? null;
      session.user.activeCompanyId = token.activeCompanyId ?? null;
      session.user.multiCompanyMode = token.multiCompanyMode ?? false;
      session.user.memberships = token.memberships ?? [];
      session.user.companies = token.companies ?? null;
      return session;
    },
  },
  pages: {
    signIn: '/',  // Página de login personalizada
  },
};