"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, IconButton } from "@kai/ui";
import { getEmployeeDetailAction } from "@/features/hr-employees/actions/employee.action";
import { getActiveContractAction } from "@/features/hr-employees/actions/contract.action";
import { getActiveEmployeeShiftAction } from "@/features/hr-jornada/actions/jornada.action";
import type { EmployeeDetailView } from "@/features/hr-employees/types/employee.types";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import type { EmploymentContractView } from "@/features/hr-employees/types/contract.types";
import { CONTRACT_KIND_LABELS } from "@/features/hr-employees/types/contract.types";
import type { EmployeeShiftView } from "@/features/hr-jornada/types/employee-shift.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { HCM_EMPLOYEES } from "@/navigation/hcm-routes";
import { EmployeeAvatarField } from "../../ui/EmployeeAvatarField";
import {
  EMPLOYEE_STATUS_LABEL,
  employeeStatusBadgeVariant,
  formatDateOnlySlash,
} from "../../ui/employee-detail/employee-detail-labels";
import { EmployeeDetailSummarySection } from "../../ui/employee-detail/EmployeeDetailSummarySection";
import { EmployeeDetailEmploymentSection } from "../../ui/employee-detail/EmployeeDetailEmploymentSection";
import { EmployeeDetailContractSection } from "../../ui/employee-detail/EmployeeDetailContractSection";
import { EmployeeDetailShiftSection } from "../../ui/employee-detail/EmployeeDetailShiftSection";
import { EmployeeDetailRemunerationsSection } from "../../ui/employee-detail/EmployeeDetailRemunerationsSection";
import { EmployeeDetailBankAccountsSection } from "../../ui/employee-detail/EmployeeDetailBankAccountsSection";
import { EmployeeDetailTimelineSection } from "../../ui/employee-detail/EmployeeDetailTimelineSection";
import { employeeSectionCardClass } from "../../ui/employee-detail/employee-section-card";
import { EmployeeDetailSectionNav } from "./EmployeeDetailSectionNav";
import {
  EMPLOYEE_DETAIL_TABS,
  type EmployeeDetailSectionId,
  employeeDetailSectionFromHash,
} from "./employee-detail-section.types";

type Props = {
  employeeId: string;
  initialDetail: EmployeeDetailView;
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

export default function EmployeeDetailPage({
  employeeId,
  initialDetail,
  branches,
  laborUnits = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<EmployeeDetailView>(initialDetail);
  const [contract, setContract] = useState<EmploymentContractView | null>(null);
  const [shift, setShift] = useState<EmployeeShiftView | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [activeSection, setActiveSection] =
    useState<EmployeeDetailSectionId>("identity");

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  const reloadMeta = useCallback(async (id: string) => {
    const [cRes, sRes] = await Promise.all([
      getActiveContractAction(id),
      getActiveEmployeeShiftAction(id),
    ]);
    setContract(cRes.success ? cRes.data : null);
    setShift(sRes.success ? sRes.data : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    void reloadMeta(employeeId).finally(() => {
      if (!cancelled) setMetaLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [employeeId, reloadMeta]);

  useEffect(() => {
    const fromHash = employeeDetailSectionFromHash(window.location.hash);
    if (fromHash) setActiveSection(fromHash);
  }, []);

  const selectSection = useCallback((id: EmployeeDetailSectionId) => {
    setActiveSection(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${nextHash}`,
      );
    }
  }, []);

  const goBack = useCallback(() => {
    const returnTo = searchParams.get("returnTo")?.trim();
    if (returnTo && returnTo.startsWith(HCM_EMPLOYEES)) {
      router.push(returnTo);
      return;
    }
    router.push(HCM_EMPLOYEES);
  }, [router, searchParams]);

  const docType = detail.person?.documentType ?? null;
  const docNum = detail.person?.documentNumber?.trim();
  const statusKey = String(detail.status || "");

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      data-test-id="employee-detail-page-root"
    >
      <header
        className="border-b border-border pb-4"
        data-test-id="employee-detail-page-header"
      >
        <div className="flex min-w-0 flex-wrap items-start gap-3 sm:gap-4">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            onClick={goBack}
            ariaLabel="Volver al listado de empleados"
            data-test-id="employee-detail-back"
          />
          <EmployeeAvatarField
            employeeId={employeeId}
            size="md"
            onChanged={() => {
              void getEmployeeDetailAction(employeeId).then((r) => {
                if (r.success) setDetail(r.employee);
              });
            }}
            data-test-id="employee-detail-hero-avatar"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                title={employeeDisplayName(detail)}
              >
                {employeeDisplayName(detail)}
              </h1>
              <Badge variant={employeeStatusBadgeVariant(statusKey)}>
                {EMPLOYEE_STATUS_LABEL[statusKey] ?? (statusKey || "—")}
              </Badge>
            </div>
            <div className="border-l-2 border-secondary pl-3 text-sm">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-foreground">
                <span className="font-medium">
                  {documentTypeLabel(docType)}
                </span>
                <span className="text-muted-foreground/80" aria-hidden>
                  ·
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {docNum ? docNum : "—"}
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                {detail.branch?.name?.trim() || "Sin sucursal"}
                <span className="mx-1.5 text-muted-foreground/60" aria-hidden>
                  ·
                </span>
                Ingreso {formatDateOnlySlash(detail.hireDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary-outlined">
                {metaLoading
                  ? "…"
                  : contract
                    ? CONTRACT_KIND_LABELS[contract.kind]
                    : "Sin contrato"}
              </Badge>
              <Badge variant="secondary-outlined">
                {metaLoading
                  ? "…"
                  : shift
                    ? `Turno: ${shift.name}`
                    : "Sin turno"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <EmployeeDetailSectionNav
        tabs={EMPLOYEE_DETAIL_TABS}
        activeId={activeSection}
        onSelect={selectSection}
      />

      <div
        id={`employee-section-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`employee-section-tab-${activeSection}`}
        className="min-h-[16rem]"
        data-test-id="employee-detail-section-panel"
        data-active-section={activeSection}
      >
        {activeSection === "identity" ? (
          <EmployeeDetailSummarySection
            detail={detail}
            loading={false}
            employeeId={employeeId}
            onDetailUpdated={setDetail}
          />
        ) : null}
        {activeSection === "employment" ? (
          <EmployeeDetailEmploymentSection
            detail={detail}
            loading={false}
            employeeId={employeeId}
            branches={branches}
            laborUnits={laborUnits}
            onDetailUpdated={setDetail}
            onGoToContract={() => selectSection("contract")}
          />
        ) : null}
        {activeSection === "contract" ? (
          <EmployeeDetailContractSection
            employeeId={employeeId}
            employeeName={employeeDisplayName(detail)}
            onChanged={() => {
              void reloadMeta(employeeId);
              void getEmployeeDetailAction(employeeId).then((r) => {
                if (r.success) setDetail(r.employee);
              });
            }}
          />
        ) : null}
        {activeSection === "shift" ? (
          <EmployeeDetailShiftSection
            employeeId={employeeId}
            employeeName={employeeDisplayName(detail)}
            onChanged={() => void reloadMeta(employeeId)}
          />
        ) : null}
        {activeSection === "remunerations" ? (
          <section
            className={employeeSectionCardClass(false)}
            data-test-id="employee-detail-remunerations-wrap"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                Liquidaciones
              </h2>
              <p className="text-xs text-muted-foreground">
                Remuneraciones asociadas a este empleado.
              </p>
            </div>
            <EmployeeDetailRemunerationsSection employeeId={employeeId} />
          </section>
        ) : null}
        {activeSection === "bankAccounts" ? (
          <section
            className={employeeSectionCardClass(false)}
            data-test-id="employee-detail-bank-wrap"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                Cuentas bancarias
              </h2>
              <p className="text-xs text-muted-foreground">
                Cuentas de la persona asociadas al empleado.
              </p>
            </div>
            <EmployeeDetailBankAccountsSection
              personId={detail.personId ?? ""}
              loading={false}
            />
          </section>
        ) : null}
        {activeSection === "timeline" ? (
          <EmployeeDetailTimelineSection employeeId={employeeId} />
        ) : null}
      </div>
    </div>
  );
}
