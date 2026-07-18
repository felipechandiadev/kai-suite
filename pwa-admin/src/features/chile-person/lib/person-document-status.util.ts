import type {
  PersonDocumentPerson,
  PersonDocumentRoles,
  PersonIntentRole,
} from "../types/person-document-lookup.types";

const DOC_TYPE_LABELS: Record<string, string> = {
  RUT: "RUT",
  PASSPORT: "Pasaporte",
  OTHER: "Otro",
};

const ROLE_LABELS: Record<PersonIntentRole, string> = {
  customer: "cliente",
  supplier: "proveedor",
  employee: "empleado",
  user: "usuario de plataforma",
};

export function documentTypeLabel(documentType?: string | null): string {
  if (!documentType) return "documento";
  return DOC_TYPE_LABELS[documentType] ?? documentType;
}

export function personDisplayName(person: PersonDocumentPerson): string {
  if (person.type === "COMPANY") {
    return (person.businessName || person.firstName || "Sin nombre").trim();
  }
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim() || "Sin nombre";
}

export function roleHasIntent(
  roles: PersonDocumentRoles | undefined,
  intent: PersonIntentRole,
): boolean {
  if (!roles) return false;
  return Boolean(roles[intent]);
}

export function existingRoleLabels(roles: PersonDocumentRoles): string[] {
  const out: string[] = [];
  if (roles.customer) out.push("cliente");
  if (roles.supplier) out.push("proveedor");
  if (roles.employee) out.push("empleado");
  if (roles.user) out.push("usuario de plataforma");
  return out;
}

export function intentRoleLabel(intent: PersonIntentRole): string {
  return ROLE_LABELS[intent];
}
