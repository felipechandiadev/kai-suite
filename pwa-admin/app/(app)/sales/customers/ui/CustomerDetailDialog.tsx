"use client";
import LoadingState from '@/shared/components/LoadingState';

import { useCallback, useEffect, useMemo, useState } from "react";
import Dialog from "@/shared/components/Dialog";
import Badge from "@/shared/components/Badge/Badge";
import { SIDE_BAR_MENU_ITEM_CLASSNAMES } from "@/shared/components/TopBar/SideBar";
import { getCustomerDetailAction } from "@/features/sales-customers/actions/customer.action";
import type { CustomerDetailView } from "@/features/sales-customers/types/customer.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import { CustomerDetailSummarySection } from "./customer-detail/CustomerDetailSummarySection";
import { CustomerDetailCreditSection } from "./customer-detail/CustomerDetailCreditSection";
import { CustomerDetailPurchasesSection } from "./customer-detail/CustomerDetailPurchasesSection";
import { CustomerDetailBackordersSection } from "./customer-detail/CustomerDetailBackordersSection";
import { CustomerDetailPaymentsSection } from "./customer-detail/CustomerDetailPaymentsSection";
import { CustomerDetailQuotasSection } from "./customer-detail/CustomerDetailQuotasSection";
import { CustomerDetailReturnsSection } from "./customer-detail/CustomerDetailReturnsSection";
import { CustomerDetailCreditNotesSection } from "./customer-detail/CustomerDetailCreditNotesSection";
import { CustomerDetailBankAccountsSection } from "./customer-detail/CustomerDetailBankAccountsSection";
import { CustomerDetailEShopSection } from "./customer-detail/CustomerDetailEShopSection";

export type CustomerDetailSectionId =
  | "summary"
  | "credit"
  | "eshop"
  | "purchases"
  | "backorders"
  | "payments"
  | "returns"
  | "creditNotes"
  | "quotas"
  | "bankAccounts";

const NAV_ITEMS: { id: CustomerDetailSectionId; label: string }[] = [
  { id: "summary", label: "Resumen" },
  { id: "credit", label: "Crédito" },
  { id: "eshop", label: "eShop" },
  { id: "purchases", label: "Compras" },
  { id: "backorders", label: "Encargos" },
  { id: "payments", label: "Pagos" },
  { id: "returns", label: "Devoluciones" },
  { id: "creditNotes", label: "Notas de crédito" },
  { id: "quotas", label: "Cuotas pendientes" },
  { id: "bankAccounts", label: "Cuentas bancarias" },
];

type CustomerDetailDialogProps = {
  open: boolean;
  customerId: string | null;
  onClose: () => void;
  internalCreditEnabled?: boolean;
};

export function CustomerDetailDialog({
  open,
  customerId,
  onClose,
  internalCreditEnabled = true,
}: CustomerDetailDialogProps) {
  const [section, setSection] = useState<CustomerDetailSectionId>("summary");
  const [detail, setDetail] = useState<CustomerDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navItems = useMemo(() => {
    if (internalCreditEnabled) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => item.id !== "credit" && item.id !== "quotas");
  }, [internalCreditEnabled]);

  useEffect(() => {
    if (!internalCreditEnabled && (section === "credit" || section === "quotas")) {
      setSection("summary");
    }
  }, [internalCreditEnabled, section]);

  const handleClose = useCallback(() => {
    setSection("summary");
    setDetail(null);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || !customerId?.trim()) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void getCustomerDetailAction(customerId.trim()).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setDetail(res.customer);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Detalle del cliente"
      headerTransparent
      size="xxl"
      fullWidth
      maxHeight="min(90vh, 900px)"
      minHeight={480}
      scroll="paper"
      showCloseButton
      hideActions
      data-test-id="customer-detail-dialog"
      contentStyle={{ maxWidth: 1120 }}
    >
      <div
        className="flex min-h-[min(75vh,820px)] w-full min-w-0 flex-1 flex-col gap-0"
        data-test-id="customer-detail-dialog-body"
      >
        <header className="shrink-0 border-b border-border px-4 py-3">
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : loading ? (
            <LoadingState className="flex items-center justify-center py-4" label="Cargando ficha" />
          ) : detail ? (
            <div className="flex flex-col gap-2.5" data-test-id="customer-detail-dialog-header">
              <h2 className="text-lg font-semibold leading-tight text-foreground">{detail.displayName}</h2>
              <div className="border-l-2 border-secondary pl-3 text-sm">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-foreground">
                  <span className="font-medium">{documentTypeLabel(detail.documentType)}</span>
                  <span className="text-muted-foreground/80" aria-hidden>
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-foreground">
                    {detail.documentNumber?.trim() ? detail.documentNumber.trim() : "—"}
                  </span>
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
            aria-label="Secciones cliente"
          >
            <ul className="flex min-w-0 flex-1 flex-row gap-1 px-2 sm:flex-col sm:gap-1 sm:px-3">
              {navItems.map((item) => {
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
                      data-test-id={`customer-detail-nav-${item.id}`}
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
              <CustomerDetailSummarySection
                detail={detail}
                loading={loading}
                customerId={customerId?.trim() ?? ""}
                onDetailUpdated={setDetail}
              />
            ) : null}
            {section === "credit" ? (
              <CustomerDetailCreditSection
                detail={detail}
                loading={loading}
                internalCreditEnabled={internalCreditEnabled}
                customerId={customerId?.trim() ?? ""}
                onDetailUpdated={setDetail}
              />
            ) : null}
            {section === "eshop" ? (
              <CustomerDetailEShopSection detail={detail} loading={loading} />
            ) : null}
            {section === "purchases" && customerId?.trim() ? (
              <CustomerDetailPurchasesSection customerId={customerId.trim()} />
            ) : null}
            {section === "backorders" && customerId?.trim() ? (
              <CustomerDetailBackordersSection customerId={customerId.trim()} />
            ) : null}
            {section === "payments" && customerId?.trim() ? (
              <CustomerDetailPaymentsSection customerId={customerId.trim()} />
            ) : null}
            {section === "returns" && customerId?.trim() ? (
              <CustomerDetailReturnsSection customerId={customerId.trim()} />
            ) : null}
            {section === "creditNotes" && customerId?.trim() ? (
              <CustomerDetailCreditNotesSection customerId={customerId.trim()} />
            ) : null}
            {section === "quotas" && customerId?.trim() ? (
              <CustomerDetailQuotasSection customerId={customerId.trim()} />
            ) : null}
            {section === "bankAccounts" ? (
              <CustomerDetailBankAccountsSection
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
