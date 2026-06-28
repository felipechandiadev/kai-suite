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
      },
      async authorize(credentials) {
        const res = await fetch(`${resolveBackendApiBase()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: credentials?.userName,
            password: credentials?.password,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error(
            '[auth] login backend falló:',
            res.status,
            typeof data?.message === 'string' ? data.message : data,
          );
          return null;
        }
        if (res.ok && data.user) {
          return {
            id: data.user.id,
            name: `${data.user.person?.firstName || ''} ${data.user.person?.lastName || ''}`.trim() || data.user.userName,
            email: data.user.email,
            accessToken: data.user.id,
            role: data.user.rol ?? null,
            companyId: data.user.companyId ?? null,
            activeCompanyId: data.activeCompanyId ?? data.user.companyId ?? null,
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
        token.companies = (user as any).companies ?? null;
      }
      // Permite actualizar la company activa via update() de next-auth.
      if (trigger === 'update' && session?.activeCompanyId !== undefined) {
        token.activeCompanyId = session.activeCompanyId ?? null;
      }
      if (trigger === 'update' && session?.companies !== undefined) {
        token.companies = session.companies ?? null;
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
      session.user.companies = token.companies ?? null;
      return session;
    },
  },
  pages: {
    signIn: '/',  // Página de login personalizada
  },
};