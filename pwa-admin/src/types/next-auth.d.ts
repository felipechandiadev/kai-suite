import NextAuth from 'next-auth';

export interface SessionCompany {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
}

export interface SessionMembership {
  companyId: string;
  roles: string[];
  isOwner: boolean;
}

export type FlowstoreUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUB_ADMIN'
  | 'OPERATOR'
  | 'POS_OPERATOR'
  | 'COURIER'
  | 'WAITER'
  | 'STOCK_OPERATOR'
  | 'KDS_OPERATOR';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      accessToken?: string;
      role?: FlowstoreUserRole | string | null;
      companyId?: string | null;
      activeCompanyId?: string | null;
      multiCompanyMode?: boolean;
      memberships?: SessionMembership[];
      companies?: SessionCompany[] | null;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    accessToken?: string;
    role?: FlowstoreUserRole | string | null;
    companyId?: string | null;
    activeCompanyId?: string | null;
    multiCompanyMode?: boolean;
    memberships?: SessionMembership[];
    companies?: SessionCompany[] | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    role?: FlowstoreUserRole | string | null;
    companyId?: string | null;
    activeCompanyId?: string | null;
    multiCompanyMode?: boolean;
    memberships?: SessionMembership[];
    companies?: SessionCompany[] | null;
  }
}
