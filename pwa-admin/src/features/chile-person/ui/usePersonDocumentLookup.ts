"use client";

import { useEffect, useRef, useState } from "react";
import { lookupPersonByDocumentAction } from "../actions/person-document.action";
import type {
  PersonDocumentLookupStatus,
  PersonIntentRole,
} from "../types/person-document-lookup.types";
import {
  documentTypeLabel,
  existingRoleLabels,
  personDisplayName,
  roleHasIntent,
} from "../lib/person-document-status.util";

const DEBOUNCE_MS = 400;
const MIN_LEN = 3;

export function usePersonDocumentLookup(params: {
  documentNumber: string;
  documentType?: string;
  intentRole: PersonIntentRole;
  enabled?: boolean;
  excludePersonId?: string;
}) {
  const { documentNumber, documentType, intentRole, enabled = true, excludePersonId } =
    params;
  const [status, setStatus] = useState<PersonDocumentLookupStatus>({ kind: "idle" });
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus({ kind: "idle" });
      return;
    }
    const trimmed = documentNumber.trim();
    if (trimmed.length < MIN_LEN) {
      setStatus({ kind: "idle" });
      return;
    }

    const seq = ++seqRef.current;
    setStatus({ kind: "loading" });
    const timer = window.setTimeout(() => {
      void (async () => {
        const r = await lookupPersonByDocumentAction({
          documentNumber: trimmed,
          documentType,
          excludePersonId,
        });
        if (seq !== seqRef.current) return;
        if (!r.success) {
          setStatus({ kind: "error", message: r.error });
          return;
        }
        if (!r.data.found || !r.data.person || !r.data.roles) {
          setStatus({ kind: "not_found" });
          return;
        }
        const person = r.data.person;
        const roles = r.data.roles;
        const displayName = personDisplayName(person);
        const docLabel = documentTypeLabel(person.documentType ?? documentType);
        if (roleHasIntent(roles, intentRole)) {
          setStatus({
            kind: "conflict_same_role",
            person,
            roles,
            displayName,
            documentTypeLabel: docLabel,
          });
          return;
        }
        setStatus({
          kind: "reuse_readonly",
          person,
          roles,
          displayName,
          documentTypeLabel: docLabel,
          existingRoleLabels: existingRoleLabels(roles),
        });
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [documentNumber, documentType, intentRole, enabled, excludePersonId]);

  return status;
}
