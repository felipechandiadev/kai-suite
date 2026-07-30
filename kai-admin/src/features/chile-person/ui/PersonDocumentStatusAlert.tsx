"use client";

import { Alert } from "@kai/ui";
import type { PersonDocumentLookupStatus, PersonIntentRole } from "../types/person-document-lookup.types";
import { intentRoleLabel } from "../lib/person-document-status.util";

export type PersonDocumentStatusAlertProps = {
  status: PersonDocumentLookupStatus;
  intentRole: PersonIntentRole;
};

export function PersonDocumentStatusAlert({
  status,
  intentRole,
}: PersonDocumentStatusAlertProps) {
  if (status.kind === "idle" || status.kind === "loading" || status.kind === "not_found") {
    return null;
  }

  if (status.kind === "error") {
    return (
      <Alert variant="error" data-test-id="person-document-lookup-error">
        <p className="m-0 min-w-0 flex-1 text-sm leading-relaxed">{status.message}</p>
      </Alert>
    );
  }

  const roleLabel = intentRoleLabel(intentRole);

  if (status.kind === "conflict_same_role") {
    return (
      <Alert variant="warning" data-test-id="person-document-conflict-same-role">
        <p className="m-0 min-w-0 flex-1 text-sm leading-relaxed">
          Este documento ({status.documentTypeLabel}) ya está registrado como {roleLabel}:{" "}
          <strong>{status.displayName}</strong>. No puedes crear otro {roleLabel} con el mismo
          documento.
        </p>
      </Alert>
    );
  }

  const rolesText =
    status.existingRoleLabels.length > 0
      ? status.existingRoleLabels.join(", ")
      : "otros roles";

  return (
    <Alert variant="info" data-test-id="person-document-reuse">
      <p className="m-0 min-w-0 flex-1 text-sm leading-relaxed">
        Este documento ({status.documentTypeLabel}) corresponde a{" "}
        <strong>{status.displayName}</strong> ({rolesText}). Los datos de la persona se
        reutilizan; completa solo los del {roleLabel}.
      </p>
    </Alert>
  );
}
