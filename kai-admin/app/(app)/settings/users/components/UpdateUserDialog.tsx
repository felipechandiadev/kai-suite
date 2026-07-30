"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Alert, Button, Dialog, Select, Switch, TextField, type Option } from "@kai/ui";
import { updateUserAction } from "@/features/settings-users/actions/user.action";
import type { UserListItem } from "@/features/settings-users/types/user.types";
import {
  GOVERNANCE_ROLE_OPTIONS,
  OPERATIONAL_ROLE_OPTIONS,
  effectiveRolesForUser,
  isGovernanceRole,
  isOperationalRole,
  normalizeUserRole,
  primaryLegacyRoleFromMembershipRoles,
} from "@/features/settings-users/types/user.types";
import { usePersonDocumentLookup } from "@/features/chile-person/ui/usePersonDocumentLookup";
import { PersonDocumentStatusAlert } from "@/features/chile-person/ui/PersonDocumentStatusAlert";
import { listAvailableCompaniesAction } from "@/features/companies/actions/companies.action";
import type { CompanyOption } from "@/features/companies/types/company.types";

const DOC_OPTIONS: Option[] = [
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "OTHER", label: "Otro" },
];

type MembershipDraft = {
  companyId: string;
  roles: string[];
  enabled: boolean;
};

type RoleMode = "governance" | "operational";

function buildPersonName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function companyLabel(c: CompanyOption): string {
  return c.nombreFantasia?.trim() || c.razonSocial.trim() || "Empresa";
}

function rolesMode(roles: string[]): RoleMode {
  if (roles.some((r) => isGovernanceRole(r))) return "governance";
  return "operational";
}

function defaultRolesForMode(mode: RoleMode, canAssignAdmin: boolean): string[] {
  if (mode === "governance") {
    return [canAssignAdmin ? "ADMIN" : "SUB_ADMIN"];
  }
  return ["POS_OPERATOR"];
}

export type UpdateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  user: UserListItem;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateUserDialog({
  open,
  onClose,
  user,
  onSuccess,
}: UpdateUserDialogProps) {
  const { data: session } = useSession();
  const activeCompanyId =
    (session?.user as { activeCompanyId?: string | null } | undefined)
      ?.activeCompanyId ?? null;
  const actorRole = session?.user?.role ?? null;
  const actorMemberships = session?.user?.memberships ?? [];
  const actorIsOwner =
    actorRole === "SUPER_ADMIN" ||
    (activeCompanyId
      ? actorMemberships.some(
          (m) => m.companyId === activeCompanyId && m.isOwner,
        )
      : actorMemberships.some((m) => m.isOwner));
  const actorIsSubAdmin = actorRole === "SUB_ADMIN";
  const canAssignAdmin =
    actorRole === "SUPER_ADMIN" ||
    (actorRole === "ADMIN" && actorIsOwner);

  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"RUT" | "PASSPORT" | "OTHER">(
    "RUT",
  );
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>(
    [],
  );
  const [memberships, setMemberships] = useState<MembershipDraft[]>([]);
  /** Modo de roles en la empresa activa (gobierno vs operativo). */
  const [activeMode, setActiveMode] = useState<RoleMode>("operational");

  const hasPerson = Boolean(
    user.personId || user.person?.id || user.person?.documentNumber,
  );
  const currentPersonId = user.personId ?? user.person?.id ?? null;
  const originalDocumentNumber = user.person?.documentNumber?.trim() ?? "";

  const normalizeDoc = (raw: string) =>
    raw.replace(/[.\-\s_]/g, "").toLowerCase();

  const documentChanged =
    hasPerson &&
    documentNumber.trim().length >= 3 &&
    normalizeDoc(documentNumber) !== normalizeDoc(originalDocumentNumber);

  const docLookup = usePersonDocumentLookup({
    documentNumber,
    documentType,
    intentRole: "user",
    enabled:
      open &&
      documentNumber.trim().length > 0 &&
      (!hasPerson || documentChanged),
    excludePersonId: currentPersonId ?? undefined,
  });

  const documentBelongsToOtherUser =
    docLookup.kind === "conflict_same_role";

  const personReadOnlyForLink =
    !hasPerson && docLookup.kind === "reuse_readonly";

  const governanceOptions: Option[] = useMemo(() => {
    const opts = GOVERNANCE_ROLE_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
    }));
    if (canAssignAdmin) return opts;
    return opts.filter((o) => o.id !== "ADMIN");
  }, [canAssignAdmin]);

  const activeMembership = useMemo(
    () =>
      memberships.find(
        (m) =>
          m.enabled &&
          (activeCompanyId ? m.companyId === activeCompanyId : true),
      ) ?? memberships.find((m) => m.enabled),
    [memberships, activeCompanyId],
  );

  useEffect(() => {
    if (!open) return;
    setUserName(user.userName);
    setMail(user.mail);
    setFirstName(user.person?.firstName?.trim() ?? "");
    setLastName(user.person?.lastName?.trim() ?? "");
    setDocumentType(
      (user.person?.documentType as "RUT" | "PASSPORT" | "OTHER") || "RUT",
    );
    setDocumentNumber(user.person?.documentNumber?.trim() ?? "");
    setPhone(user.person?.phone?.trim() ?? "");
    setError(null);

    const initialRoles = effectiveRolesForUser(user, activeCompanyId).map(
      normalizeUserRole,
    );
    setActiveMode(rolesMode(initialRoles));

    void listAvailableCompaniesAction().then((res) => {
      const companies = res.success ? res.companies : [];
      setAvailableCompanies(companies);

      const byId = new Map(
        (user.memberships ?? []).map((m) => [
          m.companyId,
          m.roles.map(normalizeUserRole),
        ]),
      );

      const drafts: MembershipDraft[] = companies.map((c) => {
        const existing = byId.get(c.id);
        const isActive =
          activeCompanyId != null
            ? c.id === activeCompanyId
            : existing != null;
        const enabled = existing != null || isActive;
        let roles =
          existing ??
          (isActive
            ? initialRoles
            : defaultRolesForMode(
                rolesMode(initialRoles),
                canAssignAdmin,
              ));
        if (roles.some(isGovernanceRole) && !canAssignAdmin) {
          roles = roles.map((r) => (r === "ADMIN" ? "SUB_ADMIN" : r));
        }
        return {
          companyId: c.id,
          enabled,
          roles: roles.length ? roles : ["POS_OPERATOR"],
        };
      });

      // Memberships del user en empresas no listadas (edge)
      for (const m of user.memberships ?? []) {
        if (!drafts.some((d) => d.companyId === m.companyId)) {
          drafts.push({
            companyId: m.companyId,
            enabled: true,
            roles: m.roles.map(normalizeUserRole),
          });
        }
      }

      if (actorIsSubAdmin && activeCompanyId) {
        setMemberships(
          drafts
            .filter((d) => d.companyId === activeCompanyId)
            .map((d) => ({ ...d, enabled: true })),
        );
      } else {
        setMemberships(drafts);
      }
    });
  }, [open, user, activeCompanyId, canAssignAdmin, actorIsSubAdmin]);

  useEffect(() => {
    if (!personReadOnlyForLink || docLookup.kind !== "reuse_readonly") return;
    const p = docLookup.person;
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setDocumentType((p.documentType as "RUT" | "PASSPORT" | "OTHER") || "RUT");
    setDocumentNumber(p.documentNumber ?? "");
    setPhone(p.phone ?? "");
    if (p.email) setMail((prev) => prev || p.email || "");
  }, [docLookup, personReadOnlyForLink]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  function updateActiveCompanyRoles(nextRoles: string[]) {
    const targetId = activeCompanyId ?? activeMembership?.companyId;
    if (!targetId) return;
    setMemberships((prev) =>
      prev.map((m) =>
        m.companyId === targetId ? { ...m, roles: nextRoles, enabled: true } : m,
      ),
    );
  }

  function setActiveGovernanceRole(role: string) {
    setActiveMode("governance");
    updateActiveCompanyRoles([role]);
  }

  function toggleOperationalRole(roleId: string) {
    setActiveMode("operational");
    const current = (activeMembership?.roles ?? []).filter(isOperationalRole);
    const has = current.includes(roleId);
    let next = has
      ? current.filter((r) => r !== roleId)
      : [...current, roleId];
    if (next.length === 0) next = ["POS_OPERATOR"];
    updateActiveCompanyRoles(next);
  }

  function switchActiveMode(mode: RoleMode) {
    setActiveMode(mode);
    updateActiveCompanyRoles(defaultRolesForMode(mode, canAssignAdmin));
  }

  function setCompanyEnabled(companyId: string, enabled: boolean) {
    const enabledCount = memberships.filter((m) => m.enabled).length;
    if (!enabled && enabledCount <= 1) {
      setError("Debe autorizar al menos una empresa");
      return;
    }
    if (
      !enabled &&
      activeCompanyId &&
      companyId === activeCompanyId &&
      enabledCount <= 1
    ) {
      setError("No se puede quitar la única empresa autorizada");
      return;
    }
    setError(null);
    setMemberships((prev) =>
      prev.map((m) => {
        if (m.companyId !== companyId) return m;
        if (!enabled) return { ...m, enabled: false };
        const roles =
          m.roles.length > 0
            ? m.roles
            : defaultRolesForMode(activeMode, canAssignAdmin);
        return { ...m, enabled: true, roles };
      }),
    );
  }

  function setCompanyGovernanceRole(companyId: string, role: string) {
    setMemberships((prev) =>
      prev.map((m) =>
        m.companyId === companyId ? { ...m, roles: [role] } : m,
      ),
    );
  }

  function toggleCompanyOperationalRole(companyId: string, roleId: string) {
    setMemberships((prev) =>
      prev.map((m) => {
        if (m.companyId !== companyId) return m;
        const current = m.roles.filter(isOperationalRole);
        const has = current.includes(roleId);
        let next = has
          ? current.filter((r) => r !== roleId)
          : [...current, roleId];
        if (next.length === 0) next = ["POS_OPERATOR"];
        return { ...m, roles: next };
      }),
    );
  }

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const linkPersonId =
          !hasPerson && docLookup.kind === "reuse_readonly"
            ? docLookup.person.id
            : undefined;

        if (!hasPerson && !linkPersonId) {
          setError(
            "Vincule una persona existente por documento, o cree el usuario de nuevo con persona.",
          );
          return;
        }
        if (documentBelongsToOtherUser) {
          setError("Ese documento ya tiene un usuario de plataforma.");
          return;
        }

        const enabled = memberships.filter((m) => m.enabled);
        if (enabled.length === 0) {
          setError("Debe autorizar al menos una empresa");
          return;
        }

        const payloadMemberships = enabled.map((m) => ({
          companyId: m.companyId,
          roles: m.roles.map(normalizeUserRole) as Array<
            | "ADMIN"
            | "POS_OPERATOR"
            | "COURIER"
            | "SUB_ADMIN"
            | "WAITER"
            | "STOCK_OPERATOR"
            | "KDS_OPERATOR"
          >,
        }));

        // Preferir membership de empresa activa primero (rol legacy).
        if (activeCompanyId) {
          payloadMemberships.sort((a, b) => {
            if (a.companyId === activeCompanyId) return -1;
            if (b.companyId === activeCompanyId) return 1;
            return 0;
          });
        }

        const personName = hasPerson
          ? buildPersonName(firstName, lastName)
          : null;

        const r = await updateUserAction({
          id: user.id,
          userName: userName.trim(),
          mail: mail.trim(),
          memberships: payloadMemberships,
          rol: primaryLegacyRoleFromMembershipRoles(
            payloadMemberships[0]?.roles ?? ["POS_OPERATOR"],
          ) as
            | "ADMIN"
            | "POS_OPERATOR"
            | "COURIER"
            | "SUB_ADMIN"
            | "WAITER"
            | "STOCK_OPERATOR"
            | "KDS_OPERATOR",
          personName,
          phone: hasPerson || linkPersonId ? phone.trim() || null : null,
          personDni:
            hasPerson || linkPersonId ? documentNumber.trim() || null : null,
          personId: linkPersonId ?? null,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit =
    !isPending &&
    userName.trim().length >= 3 &&
    mail.trim().length > 0 &&
    documentNumber.trim().length > 0 &&
    memberships.some((m) => m.enabled && m.roles.length > 0) &&
    (hasPerson
      ? firstName.trim().length > 0 &&
        (!documentChanged ||
          (docLookup.kind !== "loading" &&
            docLookup.kind !== "error" &&
            !documentBelongsToOtherUser &&
            docLookup.kind !== "reuse_readonly"))
      : docLookup.kind === "reuse_readonly");

  const activeRoles = activeMembership?.roles ?? [];
  const activeGovRole = activeRoles.find((r) => isGovernanceRole(r)) ?? "SUB_ADMIN";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar usuario"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="user-update-dialog"
      alertArea={
        <div className="flex flex-col gap-2">
          {!hasPerson ? (
            <Alert variant="warning" data-test-id="user-update-no-person">
              Este usuario no tiene persona vinculada. Busque un documento
              existente para asociarlo (misma lógica que al crear).
            </Alert>
          ) : null}
          {!hasPerson || documentChanged ? (
            <PersonDocumentStatusAlert status={docLookup} intentRole="user" />
          ) : null}
          {error ? (
            <Alert variant="error" data-test-id="user-update-error">
              {error}
            </Alert>
          ) : null}
        </div>
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="user-update-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="user-update-submit"
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          El usuario de plataforma requiere una persona natural con documento de
          identidad.
        </p>

        <Select
          label="Tipo de documento"
          name="user-update-doc-type"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(v) =>
            setDocumentType(
              (v != null ? String(v) : "RUT") as "RUT" | "PASSPORT" | "OTHER",
            )
          }
          disabled={personReadOnlyForLink || isPending}
          required
        />
        <TextField
          label="Número de documento"
          name="user-update-document-number"
          type={documentType === "RUT" ? "dni" : "text"}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-update-document"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="user-update-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required={hasPerson || personReadOnlyForLink}
            disabled={personReadOnlyForLink || isPending}
            data-test-id="user-update-first-name"
          />
          <TextField
            label="Apellidos (opcional)"
            name="user-update-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={personReadOnlyForLink || isPending}
            data-test-id="user-update-last-name"
          />
        </div>
        <TextField
          label="Teléfono (opcional)"
          name="user-update-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={personReadOnlyForLink || isPending}
          data-test-id="user-update-phone"
        />

        <p className="text-sm font-semibold text-foreground">Acceso</p>
        <TextField
          label="Usuario"
          name="user-update-username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-update-username"
        />
        <TextField
          label="Correo"
          name="user-update-mail"
          type="email"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-update-mail"
        />

        <div className="flex flex-col gap-3" data-test-id="user-update-roles-block">
          <p className="text-sm font-semibold text-foreground">
            Roles (empresa activa)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeMode === "operational" ? "primary" : "outlined"}
              onClick={() => switchActiveMode("operational")}
              disabled={isPending}
              data-test-id="user-update-mode-operational"
            >
              Operativos
            </Button>
            {!actorIsSubAdmin ? (
              <Button
                type="button"
                size="sm"
                variant={activeMode === "governance" ? "primary" : "outlined"}
                onClick={() => switchActiveMode("governance")}
                disabled={isPending || governanceOptions.length === 0}
                data-test-id="user-update-mode-governance"
              >
                Gobierno
              </Button>
            ) : null}
          </div>

          {activeMode === "governance" ? (
            <Select
              label="Rol de gobierno"
              name="user-update-gov-rol"
              options={governanceOptions}
              value={
                governanceOptions.some((o) => o.id === activeGovRole)
                  ? activeGovRole
                  : governanceOptions[0]?.id ?? "SUB_ADMIN"
              }
              onChange={(v) =>
                setActiveGovernanceRole(
                  v != null ? String(v) : "SUB_ADMIN",
                )
              }
              disabled={isPending}
              data-test-id="user-update-gov-rol"
            />
          ) : (
            <div
              className="flex flex-col gap-2 rounded-md border border-border/80 p-3"
              data-test-id="user-update-ops-roles"
            >
              {OPERATIONAL_ROLE_OPTIONS.map((opt) => {
                const checked = activeRoles.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-center justify-between gap-3 text-sm"
                  >
                    <span>{opt.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={checked}
                      disabled={isPending}
                      onChange={() => toggleOperationalRole(opt.id)}
                      data-test-id={`user-update-ops-${opt.id}`}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3" data-test-id="user-update-companies-block">
          <p className="text-sm font-semibold text-foreground">
            Empresas autorizadas
          </p>
          <p className="text-xs text-muted-foreground">
            Al autorizar otra empresa se crea o vincula la persona con el mismo
            documento en esa empresa.
          </p>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cargando empresas…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {memberships.map((m) => {
                const company =
                  availableCompanies.find((c) => c.id === m.companyId) ?? null;
                const label = company
                  ? companyLabel(company)
                  : m.companyId.slice(0, 8);
                const isActiveCo =
                  activeCompanyId != null && m.companyId === activeCompanyId;
                const lockSwitch =
                  actorIsSubAdmin ||
                  (m.enabled &&
                    memberships.filter((x) => x.enabled).length <= 1);
                const mode = rolesMode(m.roles);
                return (
                  <li
                    key={m.companyId}
                    className="rounded-md border border-border/80 p-3"
                    data-test-id={`user-update-company-${m.companyId}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {label}
                          {isActiveCo ? (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (activa)
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <Switch
                        checked={m.enabled}
                        onChange={(v) => setCompanyEnabled(m.companyId, v)}
                        disabled={isPending || lockSwitch}
                        density="compact"
                        data-test-id={`user-update-company-switch-${m.companyId}`}
                      />
                    </div>
                    {m.enabled && !isActiveCo ? (
                      <div className="mt-3 border-t border-border/60 pt-3">
                        {mode === "governance" ||
                        m.roles.some(isGovernanceRole) ? (
                          <Select
                            label="Rol"
                            name={`user-update-co-gov-${m.companyId}`}
                            options={governanceOptions}
                            value={
                              m.roles.find((r) => isGovernanceRole(r)) ??
                              governanceOptions[0]?.id ??
                              "SUB_ADMIN"
                            }
                            onChange={(v) =>
                              setCompanyGovernanceRole(
                                m.companyId,
                                v != null ? String(v) : "SUB_ADMIN",
                              )
                            }
                            disabled={isPending || actorIsSubAdmin}
                          />
                        ) : (
                          <div className="flex flex-col gap-2">
                            {OPERATIONAL_ROLE_OPTIONS.map((opt) => (
                              <label
                                key={opt.id}
                                className="flex cursor-pointer items-center justify-between gap-3 text-sm"
                              >
                                <span>{opt.label}</span>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-primary"
                                  checked={m.roles.includes(opt.id)}
                                  disabled={isPending}
                                  onChange={() =>
                                    toggleCompanyOperationalRole(
                                      m.companyId,
                                      opt.id,
                                    )
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
