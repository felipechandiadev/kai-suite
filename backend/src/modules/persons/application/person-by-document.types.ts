import type { DocumentType, PersonType } from '../domain/person.entity';

export type PersonDocumentRoleCustomer = {
  id: string;
  isActive: boolean;
};

export type PersonDocumentRoleSupplier = {
  id: string;
  isActive: boolean;
};

export type PersonDocumentRoleEmployee = {
  id: string;
  status: string;
};

export type PersonDocumentRoleUser = {
  id: string;
  userName: string;
  rol: string;
};

export type PersonDocumentRoles = {
  customer: PersonDocumentRoleCustomer | null;
  supplier: PersonDocumentRoleSupplier | null;
  employee: PersonDocumentRoleEmployee | null;
  user: PersonDocumentRoleUser | null;
};

export type PersonDocumentLookupPerson = {
  id: string;
  type: PersonType;
  firstName: string;
  lastName?: string | null;
  businessName?: string | null;
  documentType?: DocumentType | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  regionCode?: string | null;
  regionName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  treasuryCode?: string | null;
  activityStarted?: boolean;
  economicActivities?: unknown;
};

export type PersonDocumentLookupResult = {
  found: boolean;
  person?: PersonDocumentLookupPerson;
  roles?: PersonDocumentRoles;
};
