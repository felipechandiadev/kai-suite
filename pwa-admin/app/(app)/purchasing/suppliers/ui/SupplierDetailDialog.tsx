"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import Badge from "@kai/ui";
import { SIDE_BAR_MENU_ITEM_CLASSNAMES } from "@/shared/components/TopBar/SideBar";
import { getSupplierDetailAction } from "@/features/purchasing-suppliers/actions/supplier.action";
import type { SupplierDetailView } from "@/features/purchasing-suppliers/types/supplier.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import { SupplierDetailSummarySection } from "./supplier-detail/SupplierDetailSummarySection";
import { SupplierDetailCommercialSection } from "./supplier-detail/SupplierDetailCommercialSection";
import { SupplierDetailBankAccountsSection } from "./supplier-detail/SupplierDetailBankAccountsSection";

export type SupplierDetailSectionId = "summary" | "commercial" | "bankAccounts";

const NAV_ITEMS: { id: SupplierDetailSectionId; label: string }[] = [
  { id: "summary", label: "Resumen" },
  { id: "commercial", label: "Comercial" },
  { id: "bankAccounts", label: "Cuentas bancarias" },
];

function supplierDisplayName(d: SupplierDetailView): string {
  const p = d.person;
  if (!p) {
    return d.alias?.trim() || "—";
  }
  if (d.alias?.trim()) {
    return d.alias.trim();
  }
  const business = p.businessName?.trim();
  if (business) {
    return business;
  }
  const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}

type SupplierDetailDialogProps = {
  open: boolean;
  supplierId: string | null;
  onClose: () => void;
};

export function SupplierDetailDialog({ open, supplierId, onClose }: SupplierDetailDialogProps) {
  const [section, setSection] = useState<SupplierDetailSectionId>("summary");
  const [detail, setDetail] = useState<SupplierDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setSection("summary");
    setDetail(null);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !supplierId?.trim()) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getSupplierDetailAction(supplierId.trim()).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setDetail(res.supplier);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, supplierId]);

  const docType = detail?.person?.documentType ?? null;
  const docNum = detail?.person?.documentNumber?.trim();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Detalle del proveedor"
      headerTransparent
      size="xxl"
      fullWidth
      maxHeight="min(90vh, 900px)"
      minHeight={480}
      scroll="paper"
      showCloseButton
      hideActions
      data-test-id="supplier-detail-dialog"
      contentStyle={{ maxWidth: 1120 }}
    >
      <div
        className="flex min-h-[min(75vh,820px)] w-full min-w-0 flex-1 flex-col gap-0"
        data-test-id="supplier-detail-dialog-body"
      >
        <header className="shrink-0 border-b border-border px-4 py-3">
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : loading ? (
            <LoadingState className="flex items-center justify-center py-4" label="Cargando ficha" />
          ) : detail ? (
            <div className="flex flex-col gap-2.5" data-test-id="supplier-detail-dialog-header">
              <h2 className="text-lg font-semibold leading-tight text-foreground">{supplierDisplayName(detail)}</h2>
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
                <Badge variant={detail.isActive ? "success-outlined" : "secondary-outlined"}>
                  {detail.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 w-full flex-1 flex-col sm:flex-row sm:items-stretch">
          <nav
            className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-white/40 py-2 shadow-sm backdrop-blur backdrop-saturate-150 sm:w-[13.6rem] sm:flex-col sm:items-stretch sm:justify-start sm:gap-0 sm:self-stretch sm:border-b-0 sm:border-r sm:border-border sm:py-4"
            aria-label="Secciones proveedor"
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
                      data-test-id={`supplier-detail-nav-${item.id}`}
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
              <SupplierDetailSummarySection
                detail={detail}
                loading={loading}
                supplierId={supplierId?.trim() ?? ""}
                onDetailUpdated={setDetail}
              />
            ) : null}
            {section === "commercial" ? (
              <SupplierDetailCommercialSection
                detail={detail}
                loading={loading}
                supplierId={supplierId?.trim() ?? ""}
                onDetailUpdated={setDetail}
              />
            ) : null}
            {section === "bankAccounts" ? (
              <SupplierDetailBankAccountsSection
                detail={detail}
                loading={loading}
                onDetailUpdated={setDetail}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
