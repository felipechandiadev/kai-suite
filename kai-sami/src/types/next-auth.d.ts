import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      userName?: string;
      accessToken?: string;
      role?: string;
      companyId?: string | null;
      activeCompanyId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    userName?: string | null;
    role?: string;
    companyId?: string | null;
    activeCompanyId?: string | null;
  }
}
