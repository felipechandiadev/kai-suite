export type PersonIntentRole = "customer" | "supplier" | "employee" | "user";

export type PersonDocumentRoleRef = {
  id: string;
  isActive?: boolean;
  status?: string;
  userName?: string;
  rol?: string;
};

export type PersonDocumentRoles = {
  customer: PersonDocumentRoleRef | null;
  supplier: PersonDocumentRoleRef | null;
  employee: PersonDocumentRoleRef | null;
  user: PersonDocumentRoleRef | null;
};

export type PersonDocumentPerson = {
  id: string;
  type: "NATURAL" | "COMPANY" | string;
  firstName: string;
  lastName?: string | null;
  businessName?: string | null;
  documentType?: string | null;
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

export type PersonDocumentLookupData = {
  found: boolean;
  person?: PersonDocumentPerson;
  roles?: PersonDocumentRoles;
};

export type PersonDocumentLookupResult =
  | { success: true; data: PersonDocumentLookupData }
  | { success: false; error: string };

export type PersonDocumentLookupStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | {
      kind: "conflict_same_role";
      person: PersonDocumentPerson;
      roles: PersonDocumentRoles;
      displayName: string;
      documentTypeLabel: string;
    }
  | {
      kind: "reuse_readonly";
      person: PersonDocumentPerson;
      roles: PersonDocumentRoles;
      displayName: string;
      documentTypeLabel: string;
      existingRoleLabels: string[];
    };
