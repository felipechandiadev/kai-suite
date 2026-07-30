"use client";

import { Alert } from "@kai/ui";
import { usePersonDocumentLookup } from "./usePersonDocumentLookup";

function normalize(raw: string): string {
  return raw.replace(/[.\-\s_]/g, "").toLowerCase();
}

export function useDocumentEditConflict(params: {
  editing: boolean;
  documentNumber: string;
  documentType?: string;
  excludePersonId?: string | null;
  originalDocumentNumber?: string | null;
}) {
  const changed =
    params.editing &&
    params.documentNumber.trim().length >= 3 &&
    normalize(params.documentNumber) !==
      normalize(params.originalDocumentNumber ?? "");

  const status = usePersonDocumentLookup({
    documentNumber: params.documentNumber,
    documentType: params.documentType,
    intentRole: "customer",
    enabled: changed,
    excludePersonId: params.excludePersonId ?? undefined,
  });

  const conflict =
    status.kind === "reuse_readonly" || status.kind === "conflict_same_role";

  const blocked =
    changed &&
    (conflict || status.kind === "loading" || status.kind === "error");

  const alert =
    !changed ? null : status.kind === "error" ? (
      <Alert variant="error" data-test-id="document-edit-lookup-error">
        {status.message}
      </Alert>
    ) : conflict ? (
      <Alert variant="warning" data-test-id="document-edit-conflict">
        Este documento ya pertenece a otra persona (
        {status.kind === "reuse_readonly" || status.kind === "conflict_same_role"
          ? status.displayName
          : ""}
        ). No se puede guardar el cambio.
      </Alert>
    ) : null;

  return { blocked, alert, changed };
}
