"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Dialog, LoadingState } from "@kai/ui";
import { SIDE_BAR_MENU_ITEM_CLASSNAMES } from "@/shared/components/TopBar/SideBar";
import { getEmployeeDetailAction } from "@/features/hr-employees/actions/employee.action";
import type { EmployeeDetailView } from "@/features/hr-employees/types/employee.types";
import { employeeDisplayName } from "@/features/hr-employees/types/employee.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import {
  EMPLOYEE_STATUS_LABEL,
  employeeStatusBadgeVariant,
} from "./employee-detail/employee-detail-labels";
import { EmployeeDetailSummarySection } from "./employee-detail/EmployeeDetailSummarySection";
import { EmployeeDetailEmploymentSection } from "./employee-detail/EmployeeDetailEmploymentSection";
import { EmployeeDetailRemunerationsSection } from "./employee-detail/EmployeeDetailRemunerationsSection";
import { EmployeeDetailBankAccountsSection } from "./employee-detail/EmployeeDetailBankAccountsSection";

export type EmployeeDetailSectionId = "summary" | "employment" | "remunerations" | "bankAccounts";

const NAV_ITEMS: { id: EmployeeDetailSectionId; label: string }[] = [
  { id: "summary", label: "Resumen" },
  { id: "employment", label: "Datos laborales" },
  { id: "remunerations", label: "Liquidaciones" },
  { id: "bankAccounts", label: "Cuentas bancarias" },
];

type EmployeeDetailDialogProps = {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
  branches: BranchListItem[];
};

export function EmployeeDetailDialog({
  open,
  employeeId,
  onClose,
  branches,
}: EmployeeDetailDialogProps) {
  const [section, setSection] = useState<EmployeeDetailSectionId>("summary");
  const [detail, setDetail] = useState<EmployeeDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setSection("summary");
    setDetail(null);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !employeeId?.trim()) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getEmployeeDetailAction(employeeId.trim()).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setDetail(res.employee);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, employeeId]);

  const docType = detail?.person?.documentType ?? null;
  const docNum = detail?.person?.documentNumber?.trim();
  const statusKey = String(detail?.status || "");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Detalle del empleado"
      headerTransparent
      size="xxl"
      fullWidth
      maxHeight="min(90vh, 900px)"
      minHeight={480}
      scroll="paper"
      showCloseButton
      hideActions
      data-test-id="employee-detail-dialog"
      contentStyle={{ maxWidth: 1120 }}
    >
      <div
        className="flex min-h-[min(75vh,820px)] w-full min-w-0 flex-1 flex-col gap-0"
        data-test-id="employee-detail-dialog-body"
      >
        <header className="shrink-0 border-b border-border px-4 py-3">
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : loading ? (
            <LoadingState className="flex items-center justify-center py-4" label="Cargando ficha" />
          ) : detail ? (
            <div className="flex flex-col gap-2.5" data-test-id="employee-detail-dialog-header">
              <h2 className="text-lg font-semibold leading-tight text-foreground">
                {employeeDisplayName(detail)}
              </h2>
              <div className="border-l-2 border-secondary pl-3 text-sm">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-foreground">
                  <span className="font-medium">{documentTypeLabel(docType)}</span>
                  <span className="text-muted-foreground/80" aria-hidden>
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-foreground">{docNum ? docNum : "—"}</span>
                </p>
              </div>
              <div>
                <Badge variant={employeeStatusBadgeVariant(statusKey)}>
                  {EMPLOYEE_STATUS_LABEL[statusKey] ?? (statusKey || "—")}
                </Badge>
              </div>
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 w-full flex-1 flex-col sm:flex-row sm:items-stretch">
          <nav
            className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-white/40 py-2 shadow-sm backdrop-blur backdrop-saturate-150 sm:w-[13.6rem] sm:flex-col sm:items-stretch sm:justify-start sm:gap-0 sm:self-stretch sm:border-b-0 sm:border-r sm:border-border sm:py-4"
            aria-label="Secciones empleado"
          >
            <ul className="flex min-w-0 flex-1 flex-row gap-1 px-2 sm:flex-col sm:gap-1 sm:px-3">
              {NAV_ITEMS.map((item) => {
                const active = section === item.id;
                return (
                  <li key={item.id} className="shrink-0 sm:w-full">
                    <button
                      type="button"
                      className={[
                        SIDE_BAR_MENU_ITEM_CLASSNAMES,
                        "w-full cursor-pointer whitespace-nowrap text-left",
                        active
                          ? "border-l-2 border-secondary bg-background/80 shadow-sm backdrop-blur-sm"
                          : "border-l-2 border-transparent",
                      ].join(" ")}
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSection(item.id)}
                      data-test-id={`employee-detail-nav-${item.id}`}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
            {section === "summary" ? (
              <EmployeeDetailSummarySection
                detail={detail}
                loading={loading}
                employeeId={employeeId?.trim() ?? ""}
                onDetailUpdated={setDetail}
              />
            ) : null}
            {section === "employment" ? (
              <EmployeeDetailEmploymentSection
                detail={detail}
                loading={loading}
                employeeId={employeeId?.trim() ?? ""}
                branches={branches}
                onDetailUpdated={setDetail}
              />
            ) : null}
            {section === "remunerations" && employeeId?.trim() ? (
              <EmployeeDetailRemunerationsSection employeeId={employeeId.trim()} />
            ) : null}
            {section === "bankAccounts" ? (
              <EmployeeDetailBankAccountsSection
                personId={detail?.personId ?? ""}
                loading={loading}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
