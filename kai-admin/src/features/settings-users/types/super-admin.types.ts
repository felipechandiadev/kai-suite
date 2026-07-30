export interface SuperAdminPerson {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  dni?: string | null;
  phone?: string | null;
}

export interface SuperAdminUser {
  id: string;
  userName: string;
  mail: string;
  rol: "SUPER_ADMIN";
  companyId: null;
  nonDeletable: boolean;
  person?: SuperAdminPerson;
}

export interface CreateSuperAdminInput {
  userName: string;
  mail: string;
  password: string;
  firstName: string;
  lastName?: string;
}
