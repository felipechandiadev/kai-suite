"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Alert,
  Button,
  Dialog,
  DotProgress,
  IconButton,
  Select,
  TextField,
} from "@kai/ui";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  POS_CONTEXT_CHANGED_EVENT,
  readDeferredPaymentEnabledFromOfflineCache,
} from "@/features/pos-offline/lib/read-deferred-payment-enabled";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { computePosSaleTotals } from "@/features/pos-cart/lib/pos-sale-totals";
import { amountToPayWithPosDelivery } from "@/features/pos-cart/lib/amount-to-pay-with-delivery";
import { PosDeliveryDialog } from "@/features/pos-delivery/ui/PosDeliveryDialog";
import { PosDeliverySummaryCard } from "@/features/pos-delivery/ui/PosDeliverySummaryCard";
import { fetchPosDeliveryCoverageAction } from "@/features/pos-delivery/actions/pos-delivery.action";
import type { PosDeliveryConfig } from "@/features/pos-delivery/types/pos-delivery.types";
import { PosDiscountDetailDialog } from "@/features/promotions/ui/PosDiscountDetailDialog";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";
import { usePosTabletDensity } from "@/shared/hooks/usePosTabletDensity";
import { notifyCustomerDisplaySaleCompleted } from "@/features/customer-display/lib/customer-display-publisher";
import { computeCustomerDisplaySaleTotal } from "@/features/customer-display/lib/build-customer-display-snapshot";
import { PaymentDisplayPublisher } from "@/features/customer-display/ui/PaymentDisplayPublisher";
import { makePaymentLineId } from "@/features/pos-cart/pos-payment.utils";
import type {
  PosPaymentLine,
  PosPaymentMethodId,
} from "@/features/pos-cart/pos-payment.types";
import {
  isCustomerLinkedPaymentMethod,
  isNcPayoutAllowedPaymentMethod,
  isImmediateReturnRefundAllowedPaymentMethod,
} from "@/features/pos-cart/pos-payment.types";
import type {
  CustomerCreditNoteSource,
  CustomerPaymentSources,
} from "@/features/customers/types/customer-payment-sources.types";
import {
  showsPaymentReferenceField,
  validateConfiguredPaymentReference,
} from "@/features/pos-payment/lib/payment-reference-field.util";
import {
  buildPreloadPaymentLines,
  shouldReapplyPaymentPreload,
} from "@/features/pos-payment/lib/build-preload-payment-lines";
import { tryBuildCreditNotePaymentLine } from "@/features/pos-payment-methods/lib/apply-customer-linked-payment";
import { paymentMethodLabelEs, paymentAmountFieldLabel } from "@/features/pos-payment-methods/lib/payment-method-label";
import { getCustomerPosDetailBundleAction, getCustomerPosPaymentSourcesAction } from "@/features/customers/actions/customers-pos.action";
import PosCustomerPaymentSourcesPanel from "@/features/customers/ui/PosCustomerPaymentSourcesPanel";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosCustomerSearchRow } from "@/features/customers/types/pos-customer.types";
import PosCustomerSearchPanel, {
  type PosCustomerSearchInitial,
} from "@/features/customers/ui/PosCustomerSearchPanel";
import PosDiningAccountsPanel from "@/features/dining/ui/PosDiningAccountsPanel";
import { closePosDiningOrderAction } from "@/features/dining/actions/dining-pos.action";
import { isKaiFoodEnabled } from "@/config/kaifood-module.config";
import { PosCreateCustomerDialog } from "@/features/customers/ui/PosCreateCustomerDialog";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import { getEffectivePosPaymentMethodsAction } from "@/features/pos-payment-methods/actions/payment-methods-pos.action";
import {
  findCompanyBankAccount,
  printBankAccountTicketAgent,
} from "@/features/pos-payment-methods/lib/bank-account-ticket-agent";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import {
  createMpPointIntentAction,
  getMpPointIntentAction,
  getPosMercadoPagoSettingsAction,
} from "@/features/mp-point/actions/mp-point.action";
import { MercadoPagoLogo } from "@/shared/components/MercadoPagoLogo";
import { getInternalCustomerCreditContextAction } from "@/features/company/actions/company-internal-customer-credit.action";
import type { InternalCustomerCreditContext } from "@/features/company/types/company-internal-customer-credit.types";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { SaveAsQuotationDialog } from "@/app/(pos)/pos/ui/SaveAsQuotationDialog";
import { requestPosProductSearchFocus } from "@/features/pos-products/lib/pos-product-search-focus";
import { BackorderDepositDialog } from "@/app/(pos)/pos/ui/BackorderDepositDialog";
import {
  PosSaleReceiptDialog,
  buildPosSaleReceiptSnapshot,
  type PosSaleReceiptData,
} from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  buildSaleReceiptWithPrintPlan,
  boletaReducedToTicketMessage,
  hydrateCartLinesFiscalFlags,
  resolveEffectiveSaleDocumentKind,
} from "@/features/sale-print-plan";
import { resolvePosOperatorDisplayName } from "@/features/pos-print/lib/ticket-receipt-footer";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";
import { createBackorderFromPosAction } from "@/features/session/actions/create-backorder.action";
import { createSaleFromPosAction } from "@/features/session/actions/create-sale.action";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";
import {
  OFFLINE_EFFECTIVE_PAYMENT_METHODS,
  resolveOfflineCompanyDetails,
  resolveOfflineSaleDteOptions,
} from "@/features/pos-offline/lib/offline-pos-mount-fallbacks";
import { assertCatalogReady } from "@/features/pos-offline/application/catalog-readiness.usecase";
import { commitOfflineSale } from "@/features/pos-offline/application/commit-offline-sale.usecase";
import { getStoredFiscalPack, isFiscalPackExpired } from "@/features/pos-offline/application/download-fiscal-pack.usecase";
import { companyDetailsFromFiscalPackEmisor } from "@/features/pos-offline/lib/company-from-fiscal-pack";
import { collectPendingSalesFromPosAction } from "@/features/session/actions/collect-pending-sales.action";
import { collectPendingQuotasFromPosAction } from "@/features/session/actions/collect-pending-quotas.action";
import { payoutCustomerCreditNotesFromPosAction } from "@/features/session/actions/payout-customer-credit-notes.action";
import { buildCreateBackorderClientPayload } from "@/features/session/lib/build-create-backorder-payload";
import { buildCollectPendingSalesClientPayload } from "@/features/session/lib/build-collect-pending-sales-payload";
import { buildCollectPendingQuotasClientPayload } from "@/features/session/lib/build-collect-pending-quotas-payload";
import { buildPayoutCustomerCreditNotesClientPayload } from "@/features/session/lib/build-payout-customer-credit-notes-payload";
import { buildCreateSaleClientPayload } from "@/features/session/lib/build-create-sale-payload";
import {
  DEFAULT_SALE_DTE_KIND,
  buildSaleDteSelectOptions,
  effectiveDocumentOptionTitle,
  type EffectiveDocumentOption,
  type SaleDteKind,
} from "@/features/fiscal/types/sale-dte.types";
import { getEffectiveDocumentOptionsAction } from "@/features/fiscal/actions/fiscal-effective-options.action";
import {
  clearPosArCollectDraft,
  readPosArCollectDraft,
  type PosArCollectSaleRow,
} from "@/features/session/lib/pos-ar-collect-storage";
import {
  clearPosQuotaCollectDraft,
  readPosQuotaCollectDraft,
  type PosQuotaCollectRow,
} from "@/features/session/lib/pos-quota-collect-storage";
import {
  clearPosNcPayoutDraft,
  readPosNcPayoutDraft,
  type PosNcPayoutRow,
} from "@/features/session/lib/pos-nc-payout-storage";
import {
  buildConfirmCustomerReturnDocumentPayload,
  buildConfirmCustomerReturnRefundPayload,
} from "@/features/session/lib/build-create-sale-return-payload";
import { confirmCustomerReturnDocumentAction } from "@/features/session/actions/confirm-customer-return-document.action";
import { confirmCustomerReturnRefundAction } from "@/features/session/actions/confirm-customer-return-refund.action";
import { buildCustomerCreditNotePrintSnapshot } from "@/features/customer-credit-notes/lib/build-customer-credit-note-print-snapshot";
import type { CustomerCreditNotePrintData } from "@/features/customer-credit-notes/types/customer-credit-note-print.types";
import { PosCustomerCreditNoteDialog } from "@/app/(pos)/pos/payment/ui/PosCustomerCreditNoteDialog";
import { PosInternalCreditPaymentDialog } from "@/app/(pos)/pos/payment/ui/PosInternalCreditPaymentDialog";
import { formatInternalCreditPlanSubtitle } from "@/features/pos-payment/lib/internal-credit-plan";
import { Switch } from "@kai/ui";
import {
  POS_INSUFFICIENT_STOCK_LINE_CLASS,
  POS_INSUFFICIENT_STOCK_SURFACE_CLASS,
  posCartQuantityExceedsAvailableStock,
} from "@/features/pos-products/ui/posProductPreview";
import { PosNoDteBadge } from "@/features/pos-products/ui/PosNoDteBadge";

/**
 * Alto de los paneles de la pantalla de cobro respecto al viewport (`vh`).
 * Más bajo que el panel de POS porque encima hay un header propio de la
 * pantalla (Venta en curso + Resumen del cobro + CTA) que consume altura.
 */
const POS_PAYMENT_PANEL_HEIGHT_VH_DEFAULT = 76;
const POS_PAYMENT_PANEL_HEIGHT_VH_TABLET = 68;
const NON_CASH_LIMIT_MSG =
  "La suma de los medios de pago que no son efectivo no puede superar el total a pagar.";
const QUOTATION_CUSTOMER_REQUIRED_MSG = "Selecciona un cliente antes de guardar la cotización.";
const EMPTY_PAYMENT_SOURCES: CustomerPaymentSources = {
  creditNotes: [],
  orderAdvances: [],
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

/**
 * Fallback estático cuando aún no llega la respuesta efectiva del backend.
 * Mantiene la UX previa (línea CASH precargada) mientras carga.
 */
const FALLBACK_PAYMENT_OPTIONS: { id: PosPaymentMethodId; label: string }[] = [
  { id: "CASH", label: "Efectivo" },
  { id: "CREDIT_CARD", label: "Tarjeta crédito" },
  { id: "DEBIT_CARD", label: "Tarjeta débito" },
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
];

/** Monto en pesos CLP (enteros). Acepta dígitos tal como los entrega `TextField` `type="currency"`. */
function parseAmountCLP(raw: string): number | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Para montos editables en línea (permite vacío → 0). */
function parseAmountCLPInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

type PosPaymentMethodCardProps = {
  payment: PosPaymentLine;
  index: number;
  label: string;
  /** Monto disponible de la NC (saldo a favor del documento) antes de descontar esta línea. */
  creditNoteSourceBalance?: number | null;
  remaining: number;
  confirmLoading: boolean;
  paymentsCount: number;
  showRefField: boolean;
  bankAccountOptions: Array<{ id: string; label: string }>;
  onUpdateAmount: (lineId: string, raw: string) => void;
  onFillRemaining: (lineId: string) => void;
  onClearAmount: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onUpdateBankAccountKey: (lineId: string, key: string) => void;
  onUpdateReference: (lineId: string, reference: string) => void;
  onUpdateCheckField: (
    lineId: string,
    field: keyof NonNullable<PosPaymentLine["checkData"]>,
    value: string,
  ) => void;
  onUpdateVoucherField: (
    lineId: string,
    field: keyof NonNullable<PosPaymentLine["voucherData"]>,
    value: string,
  ) => void;
  voucherKind: {
    id: string;
    code: string;
    name: string;
    faceValueMode: "FIXED" | "OPEN";
    defaultFaceValue?: number | null;
    requireFaceValue: boolean;
  } | null;
  /** Abono de encargo precargado en liquidar encargo: monto fijo. */
  amountLocked?: boolean;
  /** Subtítulo del plan de crédito interno (cuotas). */
  planSubtitle?: string | null;
  onEditInternalCredit?: () => void;
  /** Layout desktop (tablet POS / ancho amplio): cheque en 2 columnas. */
  desktopLayout?: boolean;
  bankAccountPrintLoading?: boolean;
  onPrintBankAccount?: () => void;
  /** Enter en un campo del medio de pago → confirmar pago (mismo CTA del header). */
  onConfirmEnter?: () => void;
};

function paymentFieldConfirmOnEnter(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  onConfirmEnter?: () => void,
) {
  if (e.key !== "Enter" || !onConfirmEnter) return;
  e.preventDefault();
  onConfirmEnter();
}

/** Card de medio de pago: monto con nombre del medio en el label; acciones a la derecha. */
function PosPaymentMethodCard({
  payment: p,
  index,
  label,
  creditNoteSourceBalance = null,
  remaining,
  confirmLoading,
  paymentsCount,
  showRefField,
  bankAccountOptions,
  onUpdateAmount,
  onFillRemaining,
  onClearAmount,
  onRemove,
  onUpdateBankAccountKey,
  onUpdateReference,
  onUpdateCheckField,
  onUpdateVoucherField,
  voucherKind,
  amountLocked = false,
  planSubtitle = null,
  onEditInternalCredit,
  desktopLayout = false,
  bankAccountPrintLoading = false,
  onPrintBankAccount,
  onConfirmEnter,
}: PosPaymentMethodCardProps) {
  const amountValue = String(Math.max(0, Math.round(p.amount)));
  const amountLabel = paymentAmountFieldLabel(label);
  const isInternalCreditLine = p.type === "INTERNAL_CREDIT";
  const lineAmountLocked = amountLocked || isInternalCreditLine;
  const appliedNcAmount = Math.max(0, Math.round(p.amount));
  const creditNoteRemainingSaldo =
    p.creditNoteTransactionId && creditNoteSourceBalance != null
      ? Math.max(0, Math.round(creditNoteSourceBalance) - appliedNcAmount)
      : null;

  return (
    <li
      className="grid grid-cols-1 gap-2"
      data-test-id={`pos-payment-method-row-${p.id}`}
    >
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              type="currency"
              label={amountLabel}
              name={`pos-payment-line-${index}`}
              value={amountValue}
              onChange={(e) => onUpdateAmount(p.id, e.target.value)}
              readOnly={lineAmountLocked}
              title={
                amountLocked
                  ? "El abono del encargo no se puede modificar al liquidar"
                  : isInternalCreditLine
                    ? "Edite el plan con el botón lápiz"
                    : undefined
              }
              currencySymbol="$"
              alwaysShowLabel
              className="w-full min-w-0"
              endAdornment={
                <span className="inline-flex items-center gap-0.5">
                  {onEditInternalCredit ? (
                    <IconButton
                      icon="Pencil"
                      variant="action"
                      size="xs"
                      ariaLabel="Editar crédito interno"
                      title="Editar crédito interno"
                      disabled={confirmLoading}
                      onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                      onClick={onEditInternalCredit}
                      data-test-id={`pos-payment-edit-internal-credit-${p.id}`}
                    />
                  ) : null}
                  {remaining > 0.01 && !isInternalCreditLine && !amountLocked ? (
                    <IconButton
                      icon="ArrowUpToLine"
                      variant="action"
                      size="xs"
                      ariaLabel="Rellenar con saldo pendiente"
                      title="Rellenar con saldo pendiente"
                      disabled={confirmLoading}
                      onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                      onClick={() => onFillRemaining(p.id)}
                      data-test-id={`pos-payment-fill-remaining-${p.id}`}
                    />
                  ) : null}
                  {!amountLocked ? (
                    <IconButton
                      icon="X"
                      variant="action"
                      size="xs"
                      ariaLabel="Limpiar monto"
                      title="Limpiar monto"
                      disabled={confirmLoading}
                      onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                      onClick={() => onClearAmount(p.id)}
                      data-test-id={`pos-payment-clear-amount-${p.id}`}
                    />
                  ) : null}
                  <IconButton
                    icon="Trash2"
                    variant="action"
                    size="xs"
                    ariaLabel="Quitar medio de pago"
                    title="Quitar medio de pago"
                    disabled={paymentsCount <= 1 || confirmLoading || amountLocked}
                    onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                    onClick={() => onRemove(p.id)}
                    data-test-id={`pos-payment-remove-line-${p.id}`}
                  />
                </span>
              }
              data-test-id={
                index === 0 ? "pos-payment-default-cash-amount" : `pos-payment-line-amount-${p.id}`
              }
              onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
            />
          </div>
        </div>
        {planSubtitle ? (
          <p className="text-xs text-muted-foreground">{planSubtitle}</p>
        ) : null}
      </div>
      {p.type === "TRANSFER" && bankAccountOptions.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Select
                label="Cuenta bancaria destino"
                placeholder="Cuenta bancaria destino"
                value={p.bankAccountKey?.trim() ? p.bankAccountKey.trim() : null}
                onChange={(id) => onUpdateBankAccountKey(p.id, id ? String(id) : "")}
                options={bankAccountOptions}
                alwaysShowLabel
                data-test-id={`pos-payment-transfer-account-${p.id}`}
              />
            </div>
            {onPrintBankAccount && p.bankAccountKey?.trim() ? (
              <IconButton
                icon="Printer"
                variant="basicSecondary"
                size="md"
                className="mb-0.5 shrink-0"
                ariaLabel="Imprimir datos de la cuenta"
                title="Imprimir datos de la cuenta (ticket)"
                disabled={confirmLoading || bankAccountPrintLoading}
                isLoading={bankAccountPrintLoading}
                onClick={onPrintBankAccount}
                data-test-id={`pos-payment-print-bank-account-${p.id}`}
              />
            ) : null}
          </div>
        </div>
      ) : null}
      {p.creditNoteTransactionId || p.backorderTransactionId ? (
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Folio:{" "}
            <span className="font-mono text-foreground">{p.reference?.trim() || "—"}</span>
          </span>
          {p.creditNoteTransactionId &&
          creditNoteRemainingSaldo != null &&
          creditNoteRemainingSaldo > 0 ? (
            <span className="shrink-0 tabular-nums">
              Saldo NC:{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(creditNoteRemainingSaldo)}
              </span>
            </span>
          ) : null}
        </p>
      ) : null}
      {showRefField ? (
        <div className="grid grid-cols-1">
          <TextField
            label="Referencia"
            name={`pos-payment-ref-${p.id}`}
            value={p.reference}
            onChange={(e) => onUpdateReference(p.id, e.target.value)}
            alwaysShowLabel
            density="compact"
            required
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
        </div>
      ) : null}
      {p.type === "CHECK" ? (
        <div
          className={`grid gap-2 rounded-lg border border-dashed border-zinc-300 p-2 dark:border-zinc-700 ${
            desktopLayout ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          <TextField
            label="N° de cheque"
            name={`pos-payment-check-number-${p.id}`}
            value={p.checkData?.checkNumber ?? ""}
            onChange={(e) => onUpdateCheckField(p.id, "checkNumber", e.target.value)}
            alwaysShowLabel
            density="compact"
            required
            data-test-id={`pos-payment-check-number-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
          <TextField
            label="Banco emisor"
            name={`pos-payment-check-bank-${p.id}`}
            value={p.checkData?.bankName ?? ""}
            onChange={(e) => onUpdateCheckField(p.id, "bankName", e.target.value)}
            alwaysShowLabel
            density="compact"
            required
            data-test-id={`pos-payment-check-bank-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
          <TextField
            label="Girador"
            name={`pos-payment-check-drawer-${p.id}`}
            value={p.checkData?.drawerName ?? ""}
            onChange={(e) => onUpdateCheckField(p.id, "drawerName", e.target.value)}
            alwaysShowLabel
            density="compact"
            placeholder="Nombre del firmante"
            data-test-id={`pos-payment-check-drawer-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
          <TextField
            label="RUT girador"
            name={`pos-payment-check-drawer-doc-${p.id}`}
            value={p.checkData?.drawerDocument ?? ""}
            onChange={(e) => onUpdateCheckField(p.id, "drawerDocument", e.target.value)}
            alwaysShowLabel
            density="compact"
            placeholder="Opcional"
            data-test-id={`pos-payment-check-drawer-doc-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
          <TextField
            label="A fecha"
            name={`pos-payment-check-due-${p.id}`}
            value={p.checkData?.dueDate ?? ""}
            onChange={(e) => onUpdateCheckField(p.id, "dueDate", e.target.value)}
            alwaysShowLabel
            density="compact"
            placeholder="YYYY-MM-DD (opcional)"
            data-test-id={`pos-payment-check-due-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
        </div>
      ) : null}
      {p.type === "VOUCHER" ? (
        <div
          className={`grid gap-2 rounded-lg border border-dashed border-zinc-300 p-2 dark:border-zinc-700 ${
            desktopLayout ? "grid-cols-2" : "grid-cols-1"
          }`}
          data-test-id={`pos-payment-voucher-fields-${p.id}`}
        >
          {!voucherKind ? (
            <p className="col-span-full text-xs text-muted-foreground">
              Este medio no tiene tipo de voucher enlazado. Revisá la config en
              Admin.
            </p>
          ) : (
            <p className="col-span-full text-xs text-muted-foreground">
              Tipo:{" "}
              <span className="font-medium text-foreground">
                {voucherKind.code} — {voucherKind.name}
              </span>
              {voucherKind.faceValueMode === "FIXED" &&
              voucherKind.defaultFaceValue != null
                ? ` · Nominal ${Math.round(Number(voucherKind.defaultFaceValue))}`
                : null}
            </p>
          )}
          <TextField
            label="Nº de voucher"
            name={`pos-payment-voucher-ref-${p.id}`}
            value={p.reference}
            onChange={(e) => onUpdateReference(p.id, e.target.value)}
            alwaysShowLabel
            density="compact"
            required
            data-test-id={`pos-payment-voucher-ref-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
          {voucherKind?.faceValueMode !== "FIXED" ? (
            <TextField
              type="currency"
              label="Valor nominal"
              name={`pos-payment-voucher-face-${p.id}`}
              value={
                p.voucherData?.faceValue != null
                  ? String(Math.max(0, Math.round(p.voucherData.faceValue)))
                  : ""
              }
              onChange={(e) => onUpdateVoucherField(p.id, "faceValue", e.target.value)}
              alwaysShowLabel
              density="compact"
              placeholder="Requerido"
              required
              data-test-id={`pos-payment-voucher-face-${p.id}`}
              onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
            />
          ) : null}
          <TextField
            label="Emisor"
            name={`pos-payment-voucher-issuer-${p.id}`}
            value={p.voucherData?.issuerName ?? ""}
            onChange={(e) => onUpdateVoucherField(p.id, "issuerName", e.target.value)}
            alwaysShowLabel
            density="compact"
            placeholder="Opcional"
            data-test-id={`pos-payment-voucher-issuer-${p.id}`}
            onKeyDown={(e) => paymentFieldConfirmOnEnter(e, onConfirmEnter)}
          />
        </div>
      ) : null}
    </li>
  );
}

function PaymentCartReadOnlyRow({
  line,
  suggestedDiscount,
  applied,
  onToggleDiscount,
  offline,
}: {
  line: PosCartLine;
  suggestedDiscount: import("@/features/promotions/lib/discount-engine.types").ResolvedLineDiscount | null;
  applied: boolean;
  onToggleDiscount?: () => void;
  offline?: boolean;
}) {
  const q = Number(line.quantity) || 0;
  const unitGross = Number(line.unitPriceWithTax) || 0;
  const lineGross = unitGross * q;
  const discountAmount = applied
    ? Math.round(Number(line.discount?.discountAmount) || 0)
    : Math.round(Number(suggestedDiscount?.discountAmount) || 0);
  const lineNet = Math.max(0, lineGross - (applied ? discountAmount : 0));
  const showSuggestion = Boolean(suggestedDiscount) && !offline;
  const promoName =
    (applied ? line.discount?.promotionName : suggestedDiscount?.promotionName) ??
    "";
  const exceedsAvailableStock = posCartQuantityExceedsAvailableStock(line);
  const attrBits =
    line.attributes?.map((a: { attributeValue?: string | null }) => String(a.attributeValue ?? "").trim()).filter(Boolean) ?? [];
  const nameWithAttrs = formatReceiptLineDisplayName(line.productName, attrBits);
  const unit = line.unitSymbol?.trim() ? ` ${line.unitSymbol.trim()}` : "";
  const qtyPrice = `${q} × ${formatMoney(unitGross)}${unit}`;
  return (
    <li
      className={`flex w-full items-start gap-2 px-3 py-2 text-sm ${
        exceedsAvailableStock ? POS_INSUFFICIENT_STOCK_LINE_CLASS : ""
      }`}
      data-test-id={`pos-payment-cart-line-${line.variantId}`}
      data-stock-exceeded={exceedsAvailableStock ? "true" : undefined}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 wrap-break-word text-sm text-foreground">
            <span className="font-medium">{nameWithAttrs}</span>
            <span className="font-normal text-muted-foreground">
              {" "}
              · {qtyPrice}
            </span>
          </p>
          <PosNoDteBadge requiresDte={line.requiresDte} />
        </div>
        {showSuggestion ? (
          <div
            className={`flex flex-wrap items-center gap-2 text-xs ${
              applied
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-muted-foreground"
            }`}
            data-test-id={`pos-payment-cart-line-promo-${line.variantId}`}
          >
            {onToggleDiscount ? (
              <IconButton
                icon={applied ? "CheckCircle2" : "Circle"}
                variant="action"
                size="xs"
                ariaLabel={
                  applied
                    ? "Quitar descuento de la línea"
                    : "Aplicar descuento a la línea"
                }
                title={
                  applied
                    ? "Quitar descuento"
                    : "Aplicar descuento sugerido"
                }
                onClick={onToggleDiscount}
                data-test-id={`pos-payment-line-promo-toggle-${line.variantId}`}
              />
            ) : null}
            <span className={applied ? "font-medium" : ""}>
              {promoName}
              {discountAmount > 0 ? ` · −${formatMoney(discountAmount)}` : ""}
              {!applied ? " (sugerido)" : ""}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {applied && discountAmount > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground line-through">
            {formatMoney(lineGross)}
          </span>
        ) : null}
        <span className="tabular-nums font-semibold text-foreground">
          {formatMoney(applied && discountAmount > 0 ? lineNet : lineGross)}
        </span>
      </div>
    </li>
  );
}

type Props = {
  initialCustomerSearch: PosCustomerSearchInitial;
  embedded?: boolean;
  onCloseEmbedded?: () => void;
};

export default function PosPaymentWorkspace({
  initialCustomerSearch,
  embedded = false,
  onCloseEmbedded,
}: Props) {
  const router = useRouter();
  const goBackToPos = useCallback(() => {
    if (embedded && onCloseEmbedded) {
      onCloseEmbedded();
      return;
    }
    router.push("/pos");
  }, [embedded, onCloseEmbedded, router]);

  const searchParams = useSearchParams();
  const isCollectMode = (searchParams.get("mode") ?? "").trim() === "collect";
  const isQuotaMode = (searchParams.get("mode") ?? "").trim() === "quota";
  const isDebtCollectMode = isCollectMode || isQuotaMode;
  const isNcPayoutMode = (searchParams.get("mode") ?? "").trim() === "nc-payout";
  const cart = usePosCart();
  const compactLayout = usePosCompactLayout();
  const isTabletDensity = usePosTabletDensity();
  const paymentPanelVh = isTabletDensity
    ? POS_PAYMENT_PANEL_HEIGHT_VH_TABLET
    : POS_PAYMENT_PANEL_HEIGHT_VH_DEFAULT;
  const {
    payments,
    setPayments,
    saleCustomer: customer,
    setSaleCustomer: setCustomer,
    appliedPromotions,
    orderDiscount,
    suggestedLineDiscounts,
    suggestedOrderPromotions,
    togglePromotion,
    isPromotionSelected,
    loadedQuotation,
    backorderDeposit,
    setBackorderDeposit,
    posDelivery,
    setPosDelivery,
    clearPosDelivery,
    encargoModeEnabled,
    setEncargoModeEnabled,
    disableEncargoMode,
    isReturnMode,
    isFulfillBackorderMode,
    loadedReturnSale,
    loadedBackorder,
    loadedPresaleTickets,
    exitReturnMode,
    exitFulfillBackorderMode,
    quotationsEnabled,
    loadedDiningOrder,
    clearLoadedDiningOrder,
  } = cart;

  const { data: authSession } = useSession();
  const { isBackendReachable: backendReachable, isOffline } = usePosOffline();
  const [deferredPaymentEnabled, setDeferredPaymentEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void readDeferredPaymentEnabledFromOfflineCache().then((enabled) => {
        if (!cancelled) setDeferredPaymentEnabled(enabled);
      });
    };
    refresh();
    window.addEventListener(POS_CONTEXT_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(POS_CONTEXT_CHANGED_EVENT, refresh);
    };
  }, []);

  const posOperatorName = resolvePosOperatorDisplayName(
    authSession?.user as { name?: string | null; email?: string | null; userName?: string | null } | undefined,
  );

  const emitKaiScreenSaleCompleted = useCallback(() => {
    const posId = readPosContextClient()?.pointOfSaleId?.trim();
    if (!posId) return;
    notifyCustomerDisplaySaleCompleted(
      computeCustomerDisplaySaleTotal(cart.lines, cart.orderDiscount ?? 0),
      posId,
    );
  }, [cart.lines, cart.orderDiscount]);

  const saleTitleId = useId();
  const [saleSummaryOpen, setSaleSummaryOpen] = useState(false);
  const [discountDetailOpen, setDiscountDetailOpen] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);
  const [diningPanelOpen, setDiningPanelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [internalCreditDialogOpen, setInternalCreditDialogOpen] = useState(false);
  const [editingInternalCreditLineId, setEditingInternalCreditLineId] = useState<
    string | null
  >(null);
  const [saveQuotationOpen, setSaveQuotationOpen] = useState(false);
  const [backorderDepositOpen, setBackorderDepositOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [localDeliveryEnabled, setLocalDeliveryEnabled] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [internalCreditCtx, setInternalCreditCtx] =
    useState<InternalCustomerCreditContext>({
      enabled: false,
      paymentMethodId: null,
      paymentMethodLabel: null,
    });
  const [customerAvailableCredit, setCustomerAvailableCredit] = useState(0);
  const [successOpen, setSuccessOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<PosSaleReceiptData | null>(null);
  const [creditNoteSuccessOpen, setCreditNoteSuccessOpen] = useState(false);
  const [creditNotePrintData, setCreditNotePrintData] = useState<CustomerCreditNotePrintData | null>(
    null,
  );
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [posPointEnabled, setPosPointEnabled] = useState(false);
  const [mpPointBusy, setMpPointBusy] = useState(false);
  const [mpPointStatus, setMpPointStatus] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deferLoading, setDeferLoading] = useState(false);
  const [collectSales, setCollectSales] = useState<PosArCollectSaleRow[]>([]);
  const [collectQuotas, setCollectQuotas] = useState<PosQuotaCollectRow[]>([]);
  const [collectInitError, setCollectInitError] = useState("");
  const [ncPayoutCreditNotes, setNcPayoutCreditNotes] = useState<PosNcPayoutRow[]>([]);
  const [ncPayoutInitError, setNcPayoutInitError] = useState("");
  /** Devolución: reembolso inmediato en caja (muestra barra de montos y medios de pago). */
  const [immediateReturnRefund, setImmediateReturnRefund] = useState(false);
  /** Reembolso en caja (NC o devolución inmediata): solo efectivo, transferencia o cheque. */
  const cashOutRefundOnly =
    isNcPayoutMode || (isReturnMode && immediateReturnRefund);

  /**
   * Identificador de la opción seleccionada en el dialog "Agregar método".
   * Cuando hay catálogo efectivo es un `companyPaymentMethodId`; en fallback,
   * un `PosPaymentMethodId` (enum).
   */
  const [draftOptionId, setDraftOptionId] = useState<string>("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftReference, setDraftReference] = useState("");
  const [draftBankAccountKey, setDraftBankAccountKey] = useState<string>("");
  const [addAlert, setAddAlert] = useState("");
  const [paymentSources, setPaymentSources] =
    useState<CustomerPaymentSources>(EMPTY_PAYMENT_SOURCES);
  const [paymentSourcesLoading, setPaymentSourcesLoading] = useState(false);
  const [paymentSourcesError, setPaymentSourcesError] = useState<string | null>(null);

  const [pageAlert, setPageAlert] = useState("");
  const [paymentMethodsAlert, setPaymentMethodsAlert] = useState("");
  const [saleSummaryAlert, setSaleSummaryAlert] = useState("");
  const paymentCashFocusDoneRef = useRef(false);

  // ───── Medios de pago efectivos (merge company+POS) ────────────────────────
  const [effectiveMethods, setEffectiveMethods] = useState<EffectivePaymentMethod[]>([]);
  const [effectiveLoaded, setEffectiveLoaded] = useState(false);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);

  const [bankAccountOptions, setBankAccountOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [bankAccountPrintLineId, setBankAccountPrintLineId] = useState<string | null>(null);
  /** Documento tributario de la venta. */
  const [saleDteKind, setSaleDteKind] = useState<SaleDteKind>(DEFAULT_SALE_DTE_KIND);
  const [saleDteOptions, setSaleDteOptions] = useState<EffectiveDocumentOption[]>([]);
  const [saleDteLoaded, setSaleDteLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ctx = readPosContextClient();
      const posId = ctx?.pointOfSaleId?.trim();
      if (!posId) {
        if (!cancelled) setSaleDteLoaded(true);
        return;
      }
      if (!shouldUseBackendApi()) {
        const offline = await resolveOfflineSaleDteOptions(posId);
        if (cancelled) return;
        setSaleDteOptions(offline.options);
        setSaleDteKind(offline.defaultKind);
        setSaleDteLoaded(true);
        return;
      }
      try {
        const res = await getEffectiveDocumentOptionsAction(posId);
        if (cancelled) return;
        if (res.success) {
          setSaleDteOptions(res.options);
          setSaleDteKind(res.defaultKind);
        } else {
          setSaleDteOptions([{ kind: "TICKET", enabled: true }]);
          setSaleDteKind(DEFAULT_SALE_DTE_KIND);
        }
      } catch {
        if (cancelled) return;
        setSaleDteOptions([{ kind: "TICKET", enabled: true }]);
        setSaleDteKind(DEFAULT_SALE_DTE_KIND);
      }
      setSaleDteLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saleDteSelectOptions = useMemo(
    () => buildSaleDteSelectOptions(saleDteOptions),
    [saleDteOptions],
  );
  const showSaleDteSelectorCompact =
    saleDteLoaded && saleDteSelectOptions.filter((o) => !o.disabled).length > 1;

  const loadEffectivePaymentMethods = useCallback(async () => {
    const ctx = readPosContextClient();
    const posId = ctx?.pointOfSaleId?.trim();
    if (!posId) {
      setEffectiveLoaded(true);
      return;
    }
    if (!shouldUseBackendApi()) {
      setEffectiveMethods(OFFLINE_EFFECTIVE_PAYMENT_METHODS);
      setEffectiveError(null);
      setEffectiveLoaded(true);
      return;
    }
    try {
      const res = await getEffectivePosPaymentMethodsAction({
        pointOfSaleId: posId,
      });
      if (res.success) {
        setEffectiveMethods(res.paymentMethods);
        setEffectiveError(null);
      } else {
        setEffectiveMethods([]);
        setEffectiveError(res.message);
      }
    } catch {
      setEffectiveMethods(OFFLINE_EFFECTIVE_PAYMENT_METHODS);
      setEffectiveError(null);
    }
    setEffectiveLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadEffectivePaymentMethods();
      if (cancelled) return;
    })();
    const refresh = () => {
      void loadEffectivePaymentMethods();
    };
    window.addEventListener(POS_CONTEXT_CHANGED_EVENT, refresh);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener(POS_CONTEXT_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadEffectivePaymentMethods]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ctx = readPosContextClient();
        const posId = ctx?.pointOfSaleId?.trim() ?? "";
        let details: CompanyDetails | null = null;
        if (shouldUseBackendApi()) {
          details = await getCompanyDetailsAction();
        } else if (posId) {
          details = await resolveOfflineCompanyDetails(posId);
        }
        if (cancelled) return;
        setCompanyDetails(details);
        const opts =
          details?.bankAccounts?.length
            ? details.bankAccounts
                .map((a) => {
                  const key = a.accountKey?.trim() || "";
                  if (!key) return null;
                  const label = `${a.bankName} · ${a.accountType} · ${a.accountNumber}`;
                  return { id: key, label };
                })
                .filter((x): x is { id: string; label: string } => x != null)
            : [];
        setBankAccountOptions(opts);
      } catch {
        if (!cancelled) setBankAccountOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!shouldUseBackendApi()) {
      setPosPointEnabled(false);
      return () => {
        cancelled = true;
      };
    }
    void getPosMercadoPagoSettingsAction()
      .then((res) => {
        if (cancelled) return;
        setPosPointEnabled(res.success && res.posPointEnabled);
      })
      .catch(() => {
        if (!cancelled) setPosPointEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Index por `companyPaymentMethodId` para hidratar metadata por línea. */
  const methodsById = useMemo(() => {
    const map = new Map<string, EffectivePaymentMethod>();
    for (const m of effectiveMethods) map.set(m.companyPaymentMethodId, m);
    const icId = internalCreditCtx.paymentMethodId;
    if (internalCreditCtx.enabled && icId) {
      map.set(icId, {
        companyPaymentMethodId: icId,
        method: "INTERNAL_CREDIT",
        label: internalCreditCtx.paymentMethodLabel ?? "Crédito interno",
        alias: null,
        bankAccountKey: null,
        requireReference: false,
        preloadOnPaymentScreen: false,
        preloadOrder: null,
        isDefaultForChange: false,
        displayOrder: 9999,
      });
    }
    return map;
  }, [effectiveMethods, internalCreditCtx]);

  const usedCreditNoteIds = useMemo(
    () =>
      new Set(
        payments
          .map((p) => p.creditNoteTransactionId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    [payments],
  );
  const usedBackorderIds = useMemo(
    () =>
      new Set(
        payments
          .map((p) => p.backorderTransactionId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    [payments],
  );

  const loadPaymentSources = useCallback(async (customerId: string) => {
    setPaymentSourcesLoading(true);
    const res = await getCustomerPosPaymentSourcesAction(customerId);
    if (res.success) {
      setPaymentSources({
        creditNotes: res.creditNotes,
        orderAdvances: res.orderAdvances,
      });
      setPaymentSourcesError(null);
    } else {
      setPaymentSources(EMPTY_PAYMENT_SOURCES);
      setPaymentSourcesError(res.message);
    }
    setPaymentSourcesLoading(false);
  }, []);

  useEffect(() => {
    const cid = customer?.customerId?.trim();
    if (!cid) {
      setPaymentSources(EMPTY_PAYMENT_SOURCES);
      setPaymentSourcesError(null);
      return;
    }
    void loadPaymentSources(cid);
  }, [customer?.customerId, loadPaymentSources]);

  useEffect(() => {
    if (customer?.customerId?.trim()) return;
    setPayments((prev) =>
      prev.filter((p) => !p.creditNoteTransactionId && !p.backorderTransactionId),
    );
  }, [customer?.customerId, setPayments]);

  useEffect(() => {
    if (isOffline) {
      setLocalDeliveryEnabled(false);
      return;
    }
    let cancelled = false;
    void fetchPosDeliveryCoverageAction().then((res) => {
      if (cancelled) return;
      setLocalDeliveryEnabled(res.success && res.data.localDeliveryEnabled === true);
    });
    return () => {
      cancelled = true;
    };
  }, [isOffline, backendReachable]);

  const getCreditNoteAvailable = useCallback(
    (ncId: string, excludeLineId?: string) => {
      const row = paymentSources.creditNotes.find((n) => n.id === ncId);
      if (!row) return 0;
      const usedInLines = payments
        .filter((p) => p.creditNoteTransactionId === ncId && p.id !== excludeLineId)
        .reduce((a, p) => a + (Number(p.amount) || 0), 0);
      return Math.max(0, row.availableAmount - usedInLines);
    },
    [paymentSources.creditNotes, payments],
  );

  const getBackorderAvailable = useCallback(
    (boId: string, excludeLineId?: string) => {
      const row = paymentSources.orderAdvances.find((b) => b.id === boId);
      if (!row) return 0;
      const usedInLines = payments
        .filter((p) => p.backorderTransactionId === boId && p.id !== excludeLineId)
        .reduce((a, p) => a + (Number(p.amount) || 0), 0);
      return Math.max(0, row.availableAmount - usedInLines);
    },
    [paymentSources.orderAdvances, payments],
  );

  const resolveMethodForOption = useCallback(
    (optionId: string) => {
      const cfg = methodsById.get(optionId);
      return cfg?.method ?? optionId;
    },
    [methodsById],
  );

  const saleCustomerId = customer?.customerId?.trim() ?? "";
  const hasSaleCustomer = Boolean(saleCustomerId);
  const isEncargoMode = !isReturnMode && !isFulfillBackorderMode && encargoModeEnabled;
  const isQuotationMode = Boolean(loadedQuotation?.id?.trim());
  const canUsePosDelivery =
    !isOffline &&
    !isReturnMode &&
    !isFulfillBackorderMode &&
    !isEncargoMode &&
    !isDebtCollectMode &&
    !isNcPayoutMode &&
    localDeliveryEnabled;
  const deliveryFeeActive =
    canUsePosDelivery && posDelivery != null
      ? Math.max(0, Math.round(posDelivery.shippingFee))
      : 0;

  const showDeliveryCard = canUsePosDelivery || localDeliveryEnabled;
  const deliveryConfigureDisabled =
    isOffline ||
    !localDeliveryEnabled ||
    !hasSaleCustomer ||
    !canUsePosDelivery;
  const deliveryDisabledReason = isOffline
    ? "Reparto no disponible offline"
    : !localDeliveryEnabled
      ? "Reparto local no habilitado"
      : !hasSaleCustomer
        ? "Selecciona un cliente para agregar reparto"
        : !canUsePosDelivery
          ? "Reparto solo en venta normal"
          : undefined;

  useEffect(() => {
    if (!canUsePosDelivery && posDelivery) {
      clearPosDelivery();
    }
  }, [canUsePosDelivery, posDelivery, clearPosDelivery]);

  const customerLocked =
    (isFulfillBackorderMode && hasSaleCustomer) ||
    (isEncargoMode && hasSaleCustomer) ||
    (isQuotationMode && hasSaleCustomer) ||
    (isReturnMode && hasSaleCustomer && loadedReturnSale?.sourceHasCustomer === true);

  const canOfferInternalCredit =
    internalCreditCtx.enabled &&
    Boolean(internalCreditCtx.paymentMethodId) &&
    hasSaleCustomer &&
    customerAvailableCredit >= 1 &&
    !isDebtCollectMode &&
    !isNcPayoutMode &&
    !isReturnMode &&
    !isEncargoMode &&
    !isFulfillBackorderMode &&
    !isQuotaMode &&
    !isCollectMode;

  const existingInternalCreditLine = useMemo(
    () => payments.find((p) => p.type === "INTERNAL_CREDIT") ?? null,
    [payments],
  );

  /** Opciones del Select del dialog "Agregar método". */
  const paymentTypeOptions = useMemo(() => {
    const base =
      effectiveMethods.length > 0
        ? effectiveMethods.map((m) => ({
            id: m.companyPaymentMethodId,
            label: m.label,
          }))
        : FALLBACK_PAYMENT_OPTIONS.map((o) => ({ id: o.id, label: o.label }));

    return base.filter((opt) => {
      const method = resolveMethodForOption(opt.id);
      if (isCustomerLinkedPaymentMethod(method)) return false;
      if (method === "INTERNAL_CREDIT") return false;
      if (cashOutRefundOnly && !isImmediateReturnRefundAllowedPaymentMethod(method)) {
        return false;
      }
      return true;
    });
  }, [effectiveMethods, resolveMethodForOption, cashOutRefundOnly]);

  const draftPaymentAmountLabel = useMemo(() => {
    const cfg = methodsById.get(draftOptionId);
    const label =
      cfg?.label ??
      paymentTypeOptions.find((o) => o.id === draftOptionId)?.label ??
      paymentMethodLabelEs(cfg?.method ?? draftOptionId);
    return paymentAmountFieldLabel(label);
  }, [draftOptionId, methodsById, paymentTypeOptions]);

  const draftShowsRefField = useMemo(() => {
    const cfg = methodsById.get(draftOptionId);
    const enumType: PosPaymentMethodId = cfg
      ? (cfg.method as PosPaymentMethodId)
      : (draftOptionId as PosPaymentMethodId);
    return showsPaymentReferenceField(
      {
        type: enumType,
        companyPaymentMethodId: cfg?.companyPaymentMethodId ?? null,
      },
      cfg,
    );
  }, [draftOptionId, methodsById]);

  // Si el medio seleccionado es transferencia y el POS configuró una cuenta destino preferente,
  // precárgala en el diálogo (pero sin pisar una selección manual).
  useEffect(() => {
    const cfg = methodsById.get(draftOptionId);
    const enumType: PosPaymentMethodId = cfg
      ? (cfg.method as PosPaymentMethodId)
      : ((draftOptionId as PosPaymentMethodId) || "CASH");
    if (enumType === "TRANSFER") {
      setDraftBankAccountKey((prev) => prev || cfg?.bankAccountKey?.trim() || "");
    } else {
      setDraftBankAccountKey("");
    }
  }, [draftOptionId, methodsById]);

  useEffect(() => {
    const ctx = readPosContextClient();
    if (ctx?.posKind === "PRESALE") {
      router.replace("/pos");
    }
  }, [router]);

  useEffect(() => {
    if (!cart.ready) return;
    if (isDebtCollectMode || isNcPayoutMode) return;
    if (cart.lines.length === 0) {
      router.replace("/pos");
    }
  }, [cart.ready, cart.lines.length, router, isDebtCollectMode, isNcPayoutMode]);

  const pickSearchCustomer = useCallback(
    (row: PosCustomerSearchRow) => {
      if (customerLocked) return;
      if (!row.customerId) return;
      setCustomer({
        customerId: row.customerId,
        name: row.displayName || "Cliente",
        document: row.documentNumber?.trim() ?? "",
        phone: row.phone?.trim() ?? "",
        email: row.email?.trim() || null,
      });
    },
    [setCustomer, customerLocked],
  );

  const clearSaleCustomer = useCallback(() => {
    if (customerLocked) return;
    setCustomer(null);
  }, [setCustomer, customerLocked]);

  const saleTotals = useMemo(
    () => computePosSaleTotals(cart.lines, cart.orderDiscount ?? 0),
    [cart.lines, cart.orderDiscount],
  );
  const totals = { net: saleTotals.net, gross: saleTotals.gross };
  const { taxes, lineDiscountsTotal, discounts, saleTotal } = saleTotals;
  const hasInsufficientStock = useMemo(
    () => cart.lines.some((line) => posCartQuantityExceedsAvailableStock(line)),
    [cart.lines],
  );
  /** Venta normal: no cobrar si alguna línea supera el stock disponible. */
  const stockBlocksSalePayment =
    !isReturnMode && !isFulfillBackorderMode && !isEncargoMode && hasInsufficientStock;
  const stockInsufficientSaleMessage =
    "Hay productos sin stock suficiente. Ajusta cantidades en el carrito antes de cobrar.";
  const collectBalanceTotal = useMemo(
    () => collectSales.reduce((acc, s) => acc + (Number(s.balanceDue) || 0), 0),
    [collectSales],
  );
  const collectQuotaTotal = useMemo(
    () => collectQuotas.reduce((acc, q) => acc + (Number(q.amount) || 0), 0),
    [collectQuotas],
  );
  const ncPayoutBalanceTotal = useMemo(
    () =>
      ncPayoutCreditNotes.reduce((acc, n) => acc + (Number(n.availableAmount) || 0), 0),
    [ncPayoutCreditNotes],
  );
  const amountToPay = isNcPayoutMode
    ? ncPayoutBalanceTotal
    : isQuotaMode
      ? collectQuotaTotal
      : isCollectMode
        ? collectBalanceTotal
        : isEncargoMode && backorderDeposit
          ? Math.max(0, Math.round(backorderDeposit.amount))
          : amountToPayWithPosDelivery(
              saleTotal,
              canUsePosDelivery ? posDelivery : null,
            );
  const encargoDepositAmountRounded =
    isEncargoMode && backorderDeposit != null
      ? Math.max(0, Math.round(backorderDeposit.amount))
      : null;
  const isEncargoZeroDeposit =
    encargoDepositAmountRounded !== null && encargoDepositAmountRounded <= 0;

  const openBackorderDepositDialog = useCallback(() => {
    if (cart.lines.length === 0 || saleTotal <= 0) return;
    setBackorderDepositOpen(true);
  }, [cart.lines.length, saleTotal]);

  const handleToggleEncargoMode = useCallback(() => {
    if (encargoModeEnabled) {
      disableEncargoMode();
      return;
    }
    openBackorderDepositDialog();
  }, [encargoModeEnabled, disableEncargoMode, openBackorderDepositDialog]);

  const handleBackorderDepositConfirm = useCallback(
    (config: { percent: number; amount: number }) => {
      setBackorderDeposit(config);
      setEncargoModeEnabled(true);
      setBackorderDepositOpen(false);
    },
    [setBackorderDeposit, setEncargoModeEnabled],
  );

  const flowTitle = isNcPayoutMode
    ? "Devolución saldo NC"
    : isQuotaMode
      ? "Cobro de cuotas"
      : isCollectMode
        ? "Cobro pendiente"
        : isReturnMode
          ? "Devolución en curso"
          : isFulfillBackorderMode
            ? "Liquidar encargo"
            : isEncargoMode
              ? "Encargo en curso"
              : "Venta en curso";
  const summarySectionLabel = isNcPayoutMode
    ? "Notas de crédito a liquidar"
    : isQuotaMode
      ? "Cuotas a cobrar"
      : isCollectMode
        ? "Ventas a cobrar"
        : isReturnMode
          ? "Resumen de devolución"
          : isFulfillBackorderMode
            ? "Resumen de liquidación"
            : isEncargoMode
              ? "Resumen de encargo"
              : "Resumen de venta";
  const amountDueLabel = isReturnMode
    ? "Total a devolver"
    : isNcPayoutMode
      ? "Total a devolver"
      : isDebtCollectMode
        ? "Total a cobrar"
        : "Total a pagar";
  const showReturnRefundUi = !isReturnMode || immediateReturnRefund;
  const kaiFoodEnabled = isKaiFoodEnabled();
  const showDiningPanel =
    kaiFoodEnabled &&
    !isDebtCollectMode &&
    !isNcPayoutMode &&
    !isReturnMode &&
    !isFulfillBackorderMode;
  const showSaleDteSelector =
    showReturnRefundUi &&
    !isDebtCollectMode &&
    !isNcPayoutMode &&
    !isReturnMode &&
    !isEncargoMode;
  /** Devolución sin reembolso en caja: CTA con icono de documento en lugar de cobro. */
  const isReturnDocumentMode = isReturnMode && !immediateReturnRefund;
  const confirmCtaIcon = isReturnDocumentMode ? "FileText" : "CircleDollarSign";
  const confirmCtaAriaLabel = isReturnDocumentMode ? "Registrar devolución" : "Confirmar pago";

  useEffect(() => {
    if (!isReturnMode) setImmediateReturnRefund(false);
  }, [isReturnMode]);

  useEffect(() => {
    if (!cashOutRefundOnly) return;
    setPayments((prev) =>
      prev.filter((p) => isImmediateReturnRefundAllowedPaymentMethod(p.type)),
    );
  }, [cashOutRefundOnly, setPayments]);

  useEffect(() => {
    if (!shouldUseBackendApi()) return;
    void getInternalCustomerCreditContextAction()
      .then(setInternalCreditCtx)
      .catch(() => {
        setInternalCreditCtx({
          enabled: false,
          paymentMethodId: null,
          paymentMethodLabel: null,
        });
      });
  }, []);

  useEffect(() => {
    if (!saleCustomerId || !internalCreditCtx.enabled) {
      setCustomerAvailableCredit(0);
      return;
    }
    if (!shouldUseBackendApi()) {
      setCustomerAvailableCredit(0);
      return;
    }
    let cancelled = false;
    void getCustomerPosDetailBundleAction(saleCustomerId)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.customer) {
          setCustomerAvailableCredit(
            Math.max(0, Math.round(Number(res.customer.availableCredit) || 0)),
          );
        } else {
          setCustomerAvailableCredit(0);
        }
      })
      .catch(() => {
        if (!cancelled) setCustomerAvailableCredit(0);
      });
    return () => {
      cancelled = true;
    };
  }, [saleCustomerId, internalCreditCtx.enabled]);

  useEffect(() => {
    if (!isCollectMode) return;
    disableEncargoMode();
    const draft = readPosArCollectDraft();
    if (!draft) {
      setCollectInitError("No hay ventas seleccionadas para cobrar. Vuelve a la ficha del cliente.");
      setCollectSales([]);
      return;
    }
    setCollectInitError("");
    setCollectSales(draft.sales);
    setCustomer({
      customerId: draft.customerId,
      name: draft.customerDisplayName ?? draft.customerId,
      document: "",
      phone: "",
      email: null,
    });
    setPayments([]);
  }, [isCollectMode, disableEncargoMode, setCustomer, setPayments]);

  useEffect(() => {
    if (!isQuotaMode) return;
    disableEncargoMode();
    const draft = readPosQuotaCollectDraft();
    if (!draft) {
      setCollectInitError("No hay cuotas seleccionadas para cobrar. Vuelve a la ficha del cliente.");
      setCollectQuotas([]);
      return;
    }
    setCollectInitError("");
    setCollectQuotas(draft.quotas);
    setCustomer({
      customerId: draft.customerId,
      name: draft.customerDisplayName ?? draft.customerId,
      document: "",
      phone: "",
      email: null,
    });
    setPayments([]);
  }, [isQuotaMode, disableEncargoMode, setCustomer, setPayments]);

  useEffect(() => {
    if (!isNcPayoutMode) return;
    disableEncargoMode();
    const draft = readPosNcPayoutDraft();
    if (!draft) {
      setNcPayoutInitError(
        "No hay notas de crédito seleccionadas. Vuelve a la ficha del cliente.",
      );
      setNcPayoutCreditNotes([]);
      return;
    }
    setNcPayoutInitError("");
    setNcPayoutCreditNotes(draft.creditNotes);
    setCustomer({
      customerId: draft.customerId,
      name: draft.customerDisplayName ?? draft.customerId,
      document: "",
      phone: "",
      email: null,
    });
    setPayments([]);
  }, [isNcPayoutMode, disableEncargoMode, setCustomer, setPayments]);

  useEffect(() => {
    if (customer?.customerId?.trim()) {
      setSaleSummaryAlert("");
    }
  }, [customer?.customerId]);

  const openSaveQuotation = useCallback(() => {
    if (!customer?.customerId?.trim()) {
      setSaleSummaryAlert(QUOTATION_CUSTOMER_REQUIRED_MSG);
      return;
    }
    setSaleSummaryAlert("");
    setSaveQuotationOpen(true);
  }, [customer?.customerId]);

  useEffect(() => {
    if (!cart.ready || amountToPay <= 0) return;
    if (!effectiveLoaded) return;
    setPayments((prev) => {
      if (!shouldReapplyPaymentPreload(prev, effectiveMethods, cashOutRefundOnly)) {
        return prev;
      }
      return buildPreloadPaymentLines({
        effectiveMethods,
        cashOutRefundOnly,
        isFulfillBackorderMode,
        loadedBackorder,
        amountToPay,
        makeId: makePaymentLineId,
      });
    });
  }, [
    cart.ready,
    amountToPay,
    setPayments,
    effectiveLoaded,
    effectiveMethods,
    isFulfillBackorderMode,
    loadedBackorder,
    cashOutRefundOnly,
  ]);

  const appliedTotal = useMemo(() => payments.reduce((a, p) => a + p.amount, 0), [payments]);
  const nonCashTotal = useMemo(
    () => payments.filter((p) => p.type !== "CASH").reduce((a, p) => a + p.amount, 0),
    [payments],
  );
  const remaining = Math.max(0, amountToPay - appliedTotal);
  const overpay = Math.max(0, appliedTotal - amountToPay);

  useEffect(() => {
    if (nonCashTotal > amountToPay + 0.01) return;
    setPaymentMethodsAlert((prev) => (prev === NON_CASH_LIMIT_MSG ? "" : prev));
  }, [nonCashTotal, amountToPay]);

  useEffect(() => {
    if (!addOpen) return;
    if (nonCashTotal > amountToPay + 0.01) return;
    setAddAlert((prev) => (prev === NON_CASH_LIMIT_MSG ? "" : prev));
  }, [addOpen, nonCashTotal, amountToPay]);

  /**
   * Muestra referencia solo cuando la config efectiva del POS lo exige.
   */
  const showsRefField = useCallback(
    (line: {
      type: PosPaymentMethodId;
      companyPaymentMethodId?: string | null;
      creditNoteTransactionId?: string | null;
      backorderTransactionId?: string | null;
    }) => {
      const cfg = line.companyPaymentMethodId
        ? methodsById.get(line.companyPaymentMethodId)
        : null;
      return showsPaymentReferenceField(line, cfg);
    },
    [methodsById],
  );

  const openAddPayment = useCallback(() => {
    const initialOptionId = paymentTypeOptions[0]?.id ?? "CASH";
    setDraftOptionId(initialOptionId);
    setDraftAmount(remaining > 0 ? String(Math.round(remaining)) : "");
    setDraftReference("");
    setDraftBankAccountKey("");
    setAddAlert("");
    setAddOpen(true);
  }, [remaining, paymentTypeOptions]);

  const collectWithMpPoint = useCallback(async () => {
    const ctx = readPosContextClient();
    if (!ctx?.cashSessionId?.trim() || !ctx?.pointOfSaleId?.trim()) {
      setPaymentMethodsAlert("Falta sesión de caja activa para cobrar con Point.");
      return;
    }
    const amount = Math.round(remaining);
    if (amount <= 0) return;
    setMpPointBusy(true);
    setMpPointStatus("Esperando pago en la terminal Point…");
    setPaymentMethodsAlert("");
    const created = await createMpPointIntentAction({
      amount,
      cashSessionId: ctx.cashSessionId.trim(),
      pointOfSaleId: ctx.pointOfSaleId.trim(),
    });
    if (!created.success) {
      setMpPointBusy(false);
      setMpPointStatus("");
      setPaymentMethodsAlert(created.message);
      return;
    }
    let intent = created.intent;
    const deadline = Date.now() + 90_000;
    while (
      Date.now() < deadline &&
      (intent.status === "PENDING" || intent.status === "CREATED")
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await getMpPointIntentAction(intent.id);
      if (poll.success) intent = poll.intent;
      if (
        intent.status === "APPROVED" ||
        intent.status === "REJECTED" ||
        intent.status === "CANCELLED"
      ) {
        break;
      }
    }
    setMpPointBusy(false);
    setMpPointStatus("");
    if (intent.status !== "APPROVED") {
      setPaymentMethodsAlert("Pago en terminal no aprobado o cancelado.");
      return;
    }
    const auth =
      intent.metadata?.authorizationCode?.trim() ||
      `MP${intent.id.slice(0, 8)}`;
    const method: PosPaymentMethodId =
      intent.metadata?.paymentType === "debit_card" ? "DEBIT_CARD" : "CREDIT_CARD";
    setPayments((prev) => [
      ...prev,
      {
        id: makePaymentLineId(),
        type: method,
        amount,
        reference: auth,
        paymentGatewayIntentId: intent.id,
      },
    ]);
  }, [remaining, setPayments]);

  const openInternalCreditDialog = useCallback(
    (lineId?: string | null) => {
      setEditingInternalCreditLineId(lineId ?? null);
      setInternalCreditDialogOpen(true);
    },
    [],
  );

  const handleInternalCreditConfirm = useCallback(
    (line: PosPaymentLine) => {
      setPaymentMethodsAlert("");
      setPayments((prev) => {
        const without = prev.filter((p) => p.type !== "INTERNAL_CREDIT");
        return [...without, line];
      });
      setEditingInternalCreditLineId(null);
    },
    [setPayments],
  );

  const applyCreditNoteFromPanel = useCallback(
    (nc: CustomerCreditNoteSource) => {
      setPaymentMethodsAlert("");
      const result = tryBuildCreditNotePaymentLine({
        nc,
        remaining,
        amountToPay,
        nonCashTotal,
        usedCreditNoteIds,
        saleCustomerId,
      });
      if (!result.ok) {
        setPaymentMethodsAlert(result.error);
        return;
      }
      setPayments((prev) => [...prev, result.line]);
    },
    [
      remaining,
      amountToPay,
      nonCashTotal,
      usedCreditNoteIds,
      saleCustomerId,
      setPayments,
    ],
  );

  const addPayment = useCallback(() => {
    setAddAlert("");
    setPaymentMethodsAlert("");
    const amt = parseAmountCLP(draftAmount);
    if (amt == null) {
      setAddAlert("Ingresa un monto válido mayor a cero.");
      return;
    }
    // Resolver type + companyPaymentMethodId a partir de la opción elegida.
    const cfg = methodsById.get(draftOptionId);
    const enumType: PosPaymentMethodId = cfg
      ? (cfg.method as PosPaymentMethodId)
      : (draftOptionId as PosPaymentMethodId) || "CASH";
    const bankKey =
      enumType === "TRANSFER"
        ? (draftBankAccountKey.trim() ||
          cfg?.bankAccountKey?.trim() ||
          "")
        : "";
    if (enumType === "TRANSFER" && bankAccountOptions.length > 0 && !bankKey) {
      setAddAlert("Selecciona la cuenta bancaria destino para la transferencia.");
      return;
    }
    if (isCustomerLinkedPaymentMethod(enumType)) {
      setAddAlert("Usa las notas de crédito del panel del cliente para este medio de pago.");
      return;
    }
    if (cashOutRefundOnly && !isImmediateReturnRefundAllowedPaymentMethod(enumType)) {
      setAddAlert(
        isNcPayoutMode
          ? "Solo se admite efectivo, transferencia o cheque para devolver saldo de NC."
          : "Solo se admite efectivo, transferencia o cheque para el reembolso inmediato.",
      );
      return;
    }
    if (enumType === "INTERNAL_CREDIT") {
      setAddOpen(false);
      openInternalCreditDialog();
      return;
    }
    if (enumType !== "CASH" && nonCashTotal + amt > amountToPay + 0.01) {
      setAddAlert(NON_CASH_LIMIT_MSG);
      return;
    }
    if (
      enumType !== "CASH" &&
      amt > remaining + 0.01 &&
      remaining > 0
    ) {
      setAddAlert("El monto no puede superar el saldo restante.");
      return;
    }
    const voucherKind = cfg?.voucherKind ?? null;
    if (enumType === "VOUCHER" && !voucherKind) {
      setAddAlert("Este medio no tiene tipo de voucher enlazado. Revisá Admin.");
      return;
    }
    if (
      showsPaymentReferenceField(
        {
          type: enumType,
          companyPaymentMethodId: cfg?.companyPaymentMethodId ?? null,
        },
        cfg,
      ) &&
      !draftReference.trim()
    ) {
      setAddAlert("Ingresa la referencia del medio de pago.");
      return;
    }
    const fixedFace =
      voucherKind?.faceValueMode === "FIXED" && voucherKind.defaultFaceValue != null
        ? Math.round(Number(voucherKind.defaultFaceValue))
        : null;
    setPayments((prev) => [
      ...prev,
      {
        id: makePaymentLineId(),
        type: enumType,
        amount: fixedFace != null && fixedFace > 0 ? fixedFace : amt,
        reference: draftReference.trim(),
        companyPaymentMethodId: cfg?.companyPaymentMethodId ?? null,
        bankAccountKey: enumType === "TRANSFER" ? (bankKey || null) : null,
        creditNoteTransactionId: null,
        backorderTransactionId: null,
        ...(enumType === "VOUCHER" && voucherKind
          ? {
              voucherData: {
                kindId: voucherKind.id,
                kindCode: voucherKind.code,
                kindName: voucherKind.name,
                issuerName: voucherKind.defaultIssuerName?.trim() || undefined,
                faceValue: fixedFace,
              },
            }
          : {}),
      },
    ]);
    setAddOpen(false);
  }, [
    draftAmount,
    draftOptionId,
    draftReference,
    draftBankAccountKey,
    methodsById,
    remaining,
    setPayments,
    bankAccountOptions.length,
    nonCashTotal,
    amountToPay,
    cashOutRefundOnly,
    openInternalCreditDialog,
  ]);

  const isFulfillBackorderAdvanceLine = useCallback(
    (line: PosPaymentLine) =>
      isFulfillBackorderMode &&
      line.type === "ORDER_ADVANCE" &&
      Boolean(line.backorderTransactionId?.trim()),
    [isFulfillBackorderMode],
  );

  const removePayment = useCallback(
    (id: string) => {
      setPayments((prev) => {
        const row = prev.find((p) => p.id === id);
        if (row && isFulfillBackorderAdvanceLine(row)) return prev;
        return prev.filter((p) => p.id !== id);
      });
    },
    [setPayments, isFulfillBackorderAdvanceLine],
  );

  const updatePaymentLineAmount = useCallback(
    (id: string, raw: string) => {
      const next = parseAmountCLPInput(raw);
      setPageAlert("");
      setPaymentMethodsAlert("");
      let nonCashOverflow = false;
      setPayments((prev) => {
        const row = prev.find((p) => p.id === id);
        if (!row) return prev;
        if (isFulfillBackorderAdvanceLine(row)) return prev;
        if (row.type === "CASH") {
          return prev.map((p) => (p.id === id ? { ...p, amount: next } : p));
        }
        const others = prev
          .filter((p) => p.id !== id && p.type !== "CASH")
          .reduce((a, p) => a + p.amount, 0);
        let maxAllowed = Math.max(0, Math.round(amountToPay - others));
        if (row.creditNoteTransactionId?.trim()) {
          maxAllowed = Math.min(
            maxAllowed,
            getCreditNoteAvailable(row.creditNoteTransactionId.trim(), id),
          );
        }
        if (row.backorderTransactionId?.trim()) {
          maxAllowed = Math.min(
            maxAllowed,
            getBackorderAvailable(row.backorderTransactionId.trim(), id),
          );
        }
        const clamped = Math.min(next, maxAllowed);
        if (next > maxAllowed + 0.01) {
          nonCashOverflow = true;
        }
        return prev.map((p) => (p.id === id ? { ...p, amount: clamped } : p));
      });
      if (nonCashOverflow) {
        queueMicrotask(() => {
          setPaymentMethodsAlert(NON_CASH_LIMIT_MSG);
        });
      }
    },
    [amountToPay, setPayments, getCreditNoteAvailable, getBackorderAvailable, isFulfillBackorderAdvanceLine],
  );

  /** Deja el monto en cero (el medio sigue en la lista; no se considera usado hasta cargar monto). */
  const clearPaymentLineAmount = useCallback(
    (id: string) => {
      updatePaymentLineAmount(id, "");
    },
    [updatePaymentLineAmount],
  );

  /** Asigna a esta línea el saldo pendiente (efectivo: total restante; otros: tope no-efectivo). */
  const fillNonCashLineBalance = useCallback(
    (id: string) => {
      setPageAlert("");
      setPaymentMethodsAlert("");
      setPayments((prev) => {
        const row = prev.find((p) => p.id === id);
        if (!row) return prev;
        if (isFulfillBackorderAdvanceLine(row)) return prev;
        const othersAll = prev.filter((p) => p.id !== id).reduce((a, p) => a + p.amount, 0);
        const gap = Math.max(0, Math.round(amountToPay - othersAll));
        if (row.type === "CASH") {
          return prev.map((p) => (p.id === id ? { ...p, amount: gap } : p));
        }
        const othersNonCash = prev
          .filter((p) => p.id !== id && p.type !== "CASH")
          .reduce((a, p) => a + p.amount, 0);
        let maxAllowed = Math.max(0, Math.round(amountToPay - othersNonCash));
        if (row.creditNoteTransactionId?.trim()) {
          maxAllowed = Math.min(
            maxAllowed,
            getCreditNoteAvailable(row.creditNoteTransactionId.trim(), id),
          );
        }
        if (row.backorderTransactionId?.trim()) {
          maxAllowed = Math.min(
            maxAllowed,
            getBackorderAvailable(row.backorderTransactionId.trim(), id),
          );
        }
        const next = Math.min(maxAllowed, gap);
        return prev.map((p) => (p.id === id ? { ...p, amount: next } : p));
      });
    },
    [amountToPay, setPayments, getCreditNoteAvailable, getBackorderAvailable, isFulfillBackorderAdvanceLine],
  );

  const updatePaymentLineReference = useCallback(
    (id: string, reference: string) => {
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, reference } : p)));
    },
    [setPayments],
  );

  const updatePaymentLineBankAccountKey = useCallback(
    (id: string, bankAccountKey: string) => {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, bankAccountKey } : p,
        ),
      );
    },
    [setPayments],
  );

  const handlePrintBankAccount = useCallback(
    async (lineId: string) => {
      const line = payments.find((p) => p.id === lineId);
      const key = line?.bankAccountKey?.trim();
      if (!line || !key) {
        setPaymentMethodsAlert("Selecciona una cuenta bancaria para imprimir.");
        return;
      }
      const account = findCompanyBankAccount(companyDetails, key);
      if (!account) {
        setPaymentMethodsAlert("No se encontraron los datos de la cuenta bancaria.");
        return;
      }
      const cfg = line.companyPaymentMethodId
        ? methodsById.get(line.companyPaymentMethodId)
        : null;
      const paymentMethodLabel = cfg?.label ?? paymentMethodLabelEs(line.type);
      setBankAccountPrintLineId(lineId);
      setPaymentMethodsAlert("");
      try {
        const res = await printBankAccountTicketAgent({
          accountKey: key,
          bankName: account.bankName,
          accountType: account.accountType,
          accountNumber: account.accountNumber,
          accountHolderName: account.accountHolderName,
          accountHolderRut: account.accountHolderRut,
          notes: account.notes,
          isPrimary: account.isPrimary,
          paymentMethodLabel,
          company: companyDetails,
        });
        if (!res.ok) {
          setPaymentMethodsAlert(res.message);
        }
      } finally {
        setBankAccountPrintLineId(null);
      }
    },
    [payments, companyDetails, methodsById],
  );

  const updatePaymentLineCheckField = useCallback(
    (id: string, field: keyof NonNullable<PosPaymentLine["checkData"]>, value: string) => {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                checkData: {
                  checkNumber: p.checkData?.checkNumber ?? "",
                  bankName: p.checkData?.bankName ?? "",
                  drawerName: p.checkData?.drawerName,
                  drawerDocument: p.checkData?.drawerDocument,
                  issueDate: p.checkData?.issueDate,
                  dueDate: p.checkData?.dueDate,
                  [field]: value,
                },
              }
            : p,
        ),
      );
    },
    [setPayments],
  );

  const updatePaymentLineVoucherField = useCallback(
    (
      id: string,
      field: keyof NonNullable<PosPaymentLine["voucherData"]>,
      value: string,
    ) => {
      setPayments((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const cfg = p.companyPaymentMethodId
            ? methodsById.get(p.companyPaymentMethodId)
            : null;
          const kind = cfg?.voucherKind;
          let nextIssuer = p.voucherData?.issuerName;
          let nextFace = p.voucherData?.faceValue ?? null;
          let nextExpires = p.voucherData?.expiresAt;

          if (field === "issuerName") {
            nextIssuer = value;
          } else if (field === "faceValue") {
            const digits = value.replace(/\D/g, "");
            nextFace = digits ? Math.round(Number(digits)) : null;
          } else if (field === "expiresAt") {
            nextExpires = value;
          }

          return {
            ...p,
            voucherData: {
              kindId: kind?.id ?? p.voucherData?.kindId,
              kindCode: kind?.code ?? p.voucherData?.kindCode ?? "",
              kindName: kind?.name ?? p.voucherData?.kindName,
              issuerName: nextIssuer,
              faceValue:
                kind?.faceValueMode === "FIXED" && kind.defaultFaceValue != null
                  ? Math.round(Number(kind.defaultFaceValue))
                  : nextFace,
              expiresAt: nextExpires,
            },
          };
        }),
      );
    },
    [methodsById, setPayments],
  );

  useEffect(() => {
    if (payments.length === 0) {
      paymentCashFocusDoneRef.current = false;
      return;
    }
    if (paymentCashFocusDoneRef.current) return;
    paymentCashFocusDoneRef.current = true;
    const t = window.setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('input[data-test-id="pos-payment-default-cash-amount"]')
        ?.focus();
    }, 64);
    return () => clearTimeout(t);
  }, [payments.length]);

  const paymentStatusLabel = useMemo(() => {
    if (isEncargoZeroDeposit) return "Encargo sin abono";
    if (amountToPay <= 0) return "Sin total";
    if (payments.length === 0) return "Sin pagos";
    if (overpay > 0) return "Pago con vuelto";
    if (remaining <= 0.01) return "Pago completo";
    return "Monto insuficiente";
  }, [isEncargoZeroDeposit, amountToPay, remaining, overpay, payments.length]);

  const customerDisplayPaymentLines = useMemo(
    () =>
      payments
        .filter((p) => (Number(p.amount) || 0) > 0)
        .map((p) => {
          const cfg = p.companyPaymentMethodId
            ? methodsById.get(p.companyPaymentMethodId)
            : null;
          return {
            label: cfg?.label ?? paymentMethodLabelEs(p.type),
            amount: Math.round(Number(p.amount) || 0),
          };
        }),
    [payments, methodsById],
  );

  const paymentComplete =
    isEncargoZeroDeposit || (payments.length > 0 && (overpay > 0 || remaining <= 0.01));

  const paymentStatusTone = paymentComplete
    ? "text-emerald-700 dark:text-emerald-400"
    : payments.length > 0
      ? "text-red-700 dark:text-red-400"
      : "text-muted-foreground";

  const paymentStatusBoxTone = paymentComplete
    ? "bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
    : payments.length > 0
      ? "bg-red-100/70 text-red-900 dark:bg-red-900/30 dark:text-red-100"
      : "bg-slate-100/80 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100";

  const hasReturnCart =
    cart.lines.length > 0 && Boolean(loadedReturnSale?.id?.trim());

  const canConfirmReturnDocument =
    isReturnDocumentMode && hasReturnCart && hasSaleCustomer;

  const canConfirmReturnWithRefund =
    isReturnMode &&
    immediateReturnRefund &&
    hasReturnCart &&
    hasSaleCustomer &&
    amountToPay > 0 &&
    payments.length > 0 &&
    remaining <= 0.01;

  const canConfirmCollect =
    isCollectMode &&
    collectSales.length > 0 &&
    !collectInitError &&
    hasSaleCustomer &&
    amountToPay > 0 &&
    payments.length > 0 &&
    (remaining <= 0.01 || overpay > 0);

  const canConfirmQuota =
    isQuotaMode &&
    collectQuotas.length > 0 &&
    !collectInitError &&
    hasSaleCustomer &&
    amountToPay > 0 &&
    payments.length > 0 &&
    (remaining <= 0.01 || overpay > 0);

  const canConfirmNcPayout =
    isNcPayoutMode &&
    ncPayoutCreditNotes.length > 0 &&
    !ncPayoutInitError &&
    hasSaleCustomer &&
    amountToPay > 0 &&
    payments.length > 0 &&
    remaining <= 0.01 &&
    overpay <= 0.01;

  const canConfirmStandardPayment =
    amountToPay > 0 && payments.length > 0 && remaining <= 0.01;

  const canConfirmEncargo =
    isEncargoMode &&
    hasSaleCustomer &&
    backorderDeposit != null &&
    cart.lines.length > 0 &&
    saleTotal > 0 &&
    (isEncargoZeroDeposit ? remaining <= 0.01 : canConfirmStandardPayment);

  const canConfirmSale =
    !isReturnMode &&
    !isDebtCollectMode &&
    !isNcPayoutMode &&
    cart.lines.length > 0 &&
    !stockBlocksSalePayment &&
    (isEncargoMode
      ? canConfirmEncargo
      : isFulfillBackorderMode
        ? canConfirmStandardPayment && hasSaleCustomer
        : canConfirmStandardPayment);

  const canConfirm =
    canConfirmReturnDocument ||
    canConfirmReturnWithRefund ||
    canConfirmSale ||
    canConfirmCollect ||
    canConfirmQuota ||
    canConfirmNcPayout;

  const confirmPaymentDisabled = !canConfirm || confirmLoading || deferLoading;

  const confirmPaymentFromField = () => {
    if (confirmPaymentDisabled) return;
    void handleConfirm();
  };

  const showDeferPaymentButton =
    deferredPaymentEnabled &&
    !isOffline &&
    !isDebtCollectMode &&
    !isNcPayoutMode &&
    !isReturnMode &&
    !isFulfillBackorderMode &&
    !isEncargoMode &&
    !posDelivery &&
    !stockBlocksSalePayment &&
    hasSaleCustomer &&
    cart.lines.length > 0 &&
    saleTotal > 0;

  const confirmPaymentTitle = (() => {
    if (isReturnDocumentMode) {
      if (!hasReturnCart) return "Define el carrito de devolución";
      if (!hasSaleCustomer) return "Selecciona un cliente para registrar la devolución";
      return "Registrar devolución";
    }
    if (isReturnMode && immediateReturnRefund) {
      if (!hasReturnCart) return "Define el carrito de devolución";
      if (!hasSaleCustomer) return "Selecciona un cliente para confirmar el reembolso";
      if (amountToPay <= 0) return "El total a devolver debe ser mayor que cero";
      if (payments.length === 0) return "Agrega al menos un método de pago";
      if (remaining > 0.01) return "Cubre el saldo restante antes de confirmar";
      return "Confirmar reembolso";
    }
    if (isNcPayoutMode) {
      if (ncPayoutInitError) return ncPayoutInitError;
      if (ncPayoutCreditNotes.length === 0) return "No hay notas de crédito seleccionadas";
      if (!hasSaleCustomer) return "Cliente requerido";
      if (payments.length === 0) return "Agrega al menos un método de pago";
      if (remaining > 0.01) return "Cubre el total a devolver antes de confirmar";
      if (overpay > 0.01) return "El monto no puede superar el total a devolver";
      return "Confirmar devolución";
    }
    if (isQuotaMode) {
      if (collectInitError) return collectInitError;
      if (collectQuotas.length === 0) return "No hay cuotas seleccionadas";
      if (!hasSaleCustomer) return "Cliente requerido para el cobro";
      if (payments.length === 0) return "Agrega al menos un método de pago";
      if (remaining > 0.01 && overpay <= 0) {
        return "Cubre el saldo restante antes de confirmar";
      }
      return overpay > 0 ? "Confirmar cobro (con vuelto)" : "Confirmar cobro";
    }
    if (isCollectMode) {
      if (collectInitError) return collectInitError;
      if (collectSales.length === 0) return "No hay ventas seleccionadas";
      if (!hasSaleCustomer) return "Cliente requerido para el cobro";
      if (payments.length === 0) return "Agrega al menos un método de pago";
      if (remaining > 0.01 && overpay <= 0) {
        return "Cubre el saldo restante antes de confirmar";
      }
      return overpay > 0 ? "Confirmar cobro (con vuelto)" : "Confirmar cobro";
    }
    if (isFulfillBackorderMode && !hasSaleCustomer) {
      return "Selecciona el cliente del encargo";
    }
    if (isEncargoMode) {
      if (!hasSaleCustomer) return "Selecciona un cliente para confirmar el encargo";
      if (!backorderDeposit) return "Define el abono de encargo con el botón Encargo.";
      if (isEncargoZeroDeposit) return "Confirmar encargo";
      if (payments.length === 0) return "Agrega al menos un método de pago para el abono";
      if (remaining > 0.01) return "Cubre el saldo restante antes de confirmar";
      return "Confirmar encargo";
    }
    if (stockBlocksSalePayment) return stockInsufficientSaleMessage;
    return "Confirmar pago";
  })();

  const validateConfirm = (): string => {
    if (isNcPayoutMode) {
      if (ncPayoutInitError) return ncPayoutInitError;
      if (ncPayoutCreditNotes.length === 0) {
        return "No hay notas de crédito seleccionadas para devolver.";
      }
      if (!hasSaleCustomer) return "Cliente requerido.";
      if (amountToPay <= 0) return "El total a devolver debe ser mayor que cero.";
      if (payments.length === 0) return "Agrega al menos un método de pago.";
      if (remaining > 0.01) return "Cubre el total a devolver antes de confirmar.";
      if (overpay > 0.01) return "El monto pagado no puede superar el total a devolver.";
      const badMethod = payments.find((p) => !isNcPayoutAllowedPaymentMethod(p.type));
      if (badMethod) {
        return "Quita los medios de pago no permitidos (solo efectivo, transferencia o cheque).";
      }
      return "";
    }
    if (isQuotaMode) {
      if (collectInitError) return collectInitError;
      if (collectQuotas.length === 0) return "No hay cuotas seleccionadas para cobrar.";
      if (!hasSaleCustomer) return "Cliente requerido para el cobro.";
      if (amountToPay <= 0) return "El total a cobrar debe ser mayor que cero.";
      if (payments.length === 0) return "Agrega al menos un método de pago.";
      if (remaining > 0.01 && overpay <= 0) {
        return "Cubre el saldo restante antes de confirmar.";
      }
      return "";
    }
    if (isCollectMode) {
      if (collectInitError) return collectInitError;
      if (collectSales.length === 0) return "No hay ventas seleccionadas para cobrar.";
      if (!hasSaleCustomer) return "Cliente requerido para el cobro.";
      if (amountToPay <= 0) return "El total a cobrar debe ser mayor que cero.";
      if (payments.length === 0) return "Agrega al menos un método de pago.";
      if (remaining > 0.01 && overpay <= 0) {
        return "Cubre el saldo restante antes de confirmar.";
      }
      return "";
    }

    if (cart.lines.length === 0) return "El carrito está vacío.";

    if (isReturnDocumentMode) {
      if (!loadedReturnSale?.id?.trim()) {
        return "Vincula la venta origen de la devolución.";
      }
      if (!hasSaleCustomer) {
        return "Selecciona un cliente para registrar la devolución.";
      }
      return "";
    }

    if (isReturnMode && immediateReturnRefund) {
      if (!loadedReturnSale?.id?.trim()) {
        return "Vincula la venta origen de la devolución.";
      }
      if (!hasSaleCustomer) {
        return "Selecciona un cliente para confirmar el reembolso.";
      }
      if (amountToPay <= 0) return "El total a devolver debe ser mayor que cero.";
      if (payments.length === 0) return "Agrega al menos un método de pago.";
      if (nonCashTotal > amountToPay + 0.01) {
        return NON_CASH_LIMIT_MSG;
      }
      if (remaining > 0.01) return "Cubre el saldo restante antes de confirmar.";
      const badMethod = payments.find(
        (p) => !isImmediateReturnRefundAllowedPaymentMethod(p.type),
      );
      if (badMethod) {
        return "Quita los medios de pago no permitidos (solo efectivo, transferencia o cheque).";
      }
      for (const p of payments) {
        if ((Number(p.amount) || 0) <= 0) continue;
        if (p.type === "CHECK") {
          const cd = p.checkData;
          if (!cd?.checkNumber?.trim() || !cd?.bankName?.trim()) {
            return "Completa N° de cheque y banco para los pagos con cheque.";
          }
        }
        if (p.type === "VOUCHER") {
          const cfg = p.companyPaymentMethodId
            ? methodsById.get(p.companyPaymentMethodId)
            : null;
          const kind = cfg?.voucherKind ?? null;
          if (!kind) {
            return "Medio Voucher sin tipo enlazado. Revisá Admin.";
          }
          if (!p.reference?.trim()) {
            return "Ingresa el número de voucher.";
          }
          const face =
            kind.faceValueMode === "FIXED" && kind.defaultFaceValue != null
              ? Math.round(Number(kind.defaultFaceValue))
              : p.voucherData?.faceValue != null
                ? Math.round(Number(p.voucherData.faceValue))
                : null;
          if (kind.faceValueMode === "OPEN" && kind.requireFaceValue && !(face != null && face > 0)) {
            return `El tipo ${kind.name} exige valor nominal.`;
          }
          if (face != null && face > 0 && Math.round(Number(p.amount) || 0) > face) {
            return "El monto del voucher no puede superar el valor nominal.";
          }
        }
        if (p.type === "TRANSFER" && bankAccountOptions.length > 0) {
          if (!p.bankAccountKey?.trim()) {
            return "Selecciona la cuenta bancaria destino para la transferencia.";
          }
        }
        const refErr = validateConfiguredPaymentReference(
          p,
          p.companyPaymentMethodId ? methodsById.get(p.companyPaymentMethodId) : null,
        );
        if (refErr) return refErr;
      }
      return "";
    }

    if (isReturnMode) {
      return "La confirmación de devoluciones se habilitará en una próxima etapa.";
    }
    if (stockBlocksSalePayment) return stockInsufficientSaleMessage;
    if (isFulfillBackorderMode && !hasSaleCustomer) {
      return "Selecciona el cliente del encargo para liquidarlo.";
    }
    if (isEncargoMode && !hasSaleCustomer) {
      return "Selecciona un cliente para confirmar el encargo.";
    }
    if (isEncargoMode && !backorderDeposit) {
      return "Define el abono de encargo con el botón Encargo.";
    }
    if (isEncargoMode && isEncargoZeroDeposit) {
      if (saleTotal <= 0) return "El total del encargo debe ser mayor que cero.";
      return "";
    }
    if (amountToPay <= 0) return "El total debe ser mayor que cero.";
    if (payments.length === 0) return "Agrega al menos un método de pago.";
    if (nonCashTotal > amountToPay + 0.01) {
      return NON_CASH_LIMIT_MSG;
    }
    if (remaining > 0.01) return "Cubre el saldo restante antes de confirmar.";
    for (const p of payments) {
      if ((Number(p.amount) || 0) <= 0) continue;
      if (p.type === "CHECK") {
        const cd = p.checkData;
        if (!cd?.checkNumber?.trim() || !cd?.bankName?.trim()) {
          return "Completa N° de cheque y banco para los pagos con cheque.";
        }
      }
      if (p.type === "VOUCHER") {
        const cfg = p.companyPaymentMethodId
          ? methodsById.get(p.companyPaymentMethodId)
          : null;
        const kind = cfg?.voucherKind ?? null;
        if (!kind) {
          return "Medio Voucher sin tipo enlazado. Revisá Admin.";
        }
        if (!p.reference?.trim()) {
          return "Ingresa el número de voucher.";
        }
        const face =
          kind.faceValueMode === "FIXED" && kind.defaultFaceValue != null
            ? Math.round(Number(kind.defaultFaceValue))
            : p.voucherData?.faceValue != null
              ? Math.round(Number(p.voucherData.faceValue))
              : null;
        if (kind.faceValueMode === "OPEN" && kind.requireFaceValue && !(face != null && face > 0)) {
          return `El tipo ${kind.name} exige valor nominal.`;
        }
        if (face != null && face > 0 && Math.round(Number(p.amount) || 0) > face) {
          return "El monto del voucher no puede superar el valor nominal.";
        }
      }
      if (p.type === "TRANSFER" && bankAccountOptions.length > 0) {
        if (!p.bankAccountKey?.trim()) {
          return "Selecciona la cuenta bancaria destino para la transferencia.";
        }
      }
      if (p.type === "ORDER_ADVANCE" && isFulfillBackorderMode) {
        if (!p.backorderTransactionId?.trim()) {
          return "El abono debe estar vinculado al encargo.";
        }
        if (p.backorderTransactionId.trim() !== loadedBackorder?.id) {
          return "El abono no corresponde al encargo cargado.";
        }
      }
      const refErr = validateConfiguredPaymentReference(
        p,
        p.companyPaymentMethodId ? methodsById.get(p.companyPaymentMethodId) : null,
      );
      if (refErr) return refErr;
    }
    if (isFulfillBackorderMode && !loadedBackorder?.id?.trim()) {
      return "Vincula el encargo antes de confirmar.";
    }
    return "";
  };

  const handleDeferPaymentSale = async () => {
    if (!showDeferPaymentButton || !deferredPaymentEnabled || isOffline) return;
    setPageAlert("");
    setDeferLoading(true);
    const posCtx = readPosContextClient();
    const cashSessionId = posCtx?.cashSessionId?.trim();
    const pointOfSaleId = posCtx?.pointOfSaleId?.trim();
    if (!cashSessionId || !pointOfSaleId) {
      setDeferLoading(false);
      setPageAlert(
        "Falta la sesión de caja en el contexto del POS. Ve a la configuración de sesión y vuelve a entrar al punto de venta.",
      );
      return;
    }
    if (!customer?.customerId?.trim()) {
      setDeferLoading(false);
      setPageAlert("Selecciona un cliente para emitir la venta sin pago.");
      return;
    }
    try {
      const deferRes = await createSaleFromPosAction(
        buildCreateSaleClientPayload({
          pointOfSaleId,
          cashSessionId,
          cartLines: cart.lines,
          payments: [],
          customer,
          appliedPromotions,
          appliedTotal: 0,
          overpay: 0,
          deferPayment: true,
          loadedQuotation: cart.loadedQuotation,
          diningOrderId: loadedDiningOrder?.id ?? null,
        }),
      );
      if (!deferRes.success) {
        setDeferLoading(false);
        setPageAlert(deferRes.message);
        return;
      }
      let details = companyDetails;
      if (!details) {
        try {
          details = (await getCompanyDetailsAction()) ?? null;
          if (details) setCompanyDetails(details);
        } catch {
          details = null;
        }
      }
      const snapshot = buildPosSaleReceiptSnapshot({
        lines: cart.lines,
        payments: [],
        customer,
        company: details,
        posContext: posCtx,
        appliedPromotions,
        orderDiscount,
        lineDiscountsTotal,
        totals: {
          net: totals.net,
          gross: totals.gross,
          taxes,
          discounts,
          saleTotal,
          appliedTotal: 0,
          overpay: 0,
        },
        methodsById,
        loadedQuotation,
        saleFolio: deferRes.documentNumber,
        collectionPending: true,
        operatorName: posOperatorName,
      });
      setReceiptData(snapshot);
      setDeferLoading(false);
      emitKaiScreenSaleCompleted();
      setSuccessOpen(true);
    } catch (e) {
      setDeferLoading(false);
      setPageAlert(
        e instanceof Error ? e.message : "No se pudo registrar la venta sin pago.",
      );
    }
  };

  const handleConfirm = async () => {
    const err = validateConfirm();
    setPageAlert("");
    setPaymentMethodsAlert("");
    if (err) {
      if (err === NON_CASH_LIMIT_MSG) {
        setPaymentMethodsAlert(err);
      } else {
        setPageAlert(err);
      }
      return;
    }
    setConfirmLoading(true);
    const posCtx = readPosContextClient();
    const cashSessionId = posCtx?.cashSessionId?.trim();
    const pointOfSaleId = posCtx?.pointOfSaleId?.trim();
    if (!cashSessionId || !pointOfSaleId) {
      setConfirmLoading(false);
      setPageAlert(
        "Falta la sesión de caja en el contexto del POS. Ve a la configuración de sesión y vuelve a entrar al punto de venta.",
      );
      return;
    }

    if (isNcPayoutMode) {
      const customerId = customer?.customerId?.trim();
      if (!customerId) {
        setConfirmLoading(false);
        setPageAlert("Cliente requerido.");
        return;
      }
      try {
        const payoutRes = await payoutCustomerCreditNotesFromPosAction(
          buildPayoutCustomerCreditNotesClientPayload({
            pointOfSaleId,
            cashSessionId,
            customerId,
            creditNoteTransactionIds: ncPayoutCreditNotes.map((n) => n.id),
            payments,
          }),
        );
        if (!payoutRes.success) {
          setConfirmLoading(false);
          setPageAlert(payoutRes.message);
          return;
        }
        clearPosNcPayoutDraft();
        let details = companyDetails;
        if (!details) {
          try {
            details = (await getCompanyDetailsAction()) ?? null;
            if (details) setCompanyDetails(details);
          } catch {
            details = null;
          }
        }
        const snapshot = buildPosSaleReceiptSnapshot({
          lines: [],
          payments,
          customer,
          company: details,
          posContext: posCtx,
          appliedPromotions: [],
          orderDiscount: 0,
          lineDiscountsTotal: 0,
          totals: {
            net: 0,
            gross: 0,
            taxes: 0,
            discounts: 0,
            saleTotal: ncPayoutBalanceTotal,
            appliedTotal,
            overpay: 0,
          },
          methodsById,
          loadedQuotation: null,
          saleFolio: payoutRes.documentNumber,
          documentKind: "sale",
          ncPayout: payoutRes.allocations.map((a) => ({
            folio: a.documentNumber,
            amount: a.amount,
          })),
          operatorName: posOperatorName,
        });
        setReceiptData(snapshot);
        setConfirmLoading(false);
        emitKaiScreenSaleCompleted();
        setSuccessOpen(true);
        return;
      } catch (e) {
        setConfirmLoading(false);
        setPageAlert(e instanceof Error ? e.message : "No se pudo registrar la devolución.");
        return;
      }
    }

    if (isQuotaMode) {
      const customerId = customer?.customerId?.trim();
      if (!customerId) {
        setConfirmLoading(false);
        setPageAlert("Cliente requerido para el cobro.");
        return;
      }
      try {
        const quotaRes = await collectPendingQuotasFromPosAction(
          buildCollectPendingQuotasClientPayload({
            pointOfSaleId,
            cashSessionId,
            customerId,
            installmentIds: collectQuotas.map((q) => q.id),
            payments,
          }),
        );
        if (!quotaRes.success) {
          setConfirmLoading(false);
          setPageAlert(quotaRes.message);
          return;
        }
        clearPosQuotaCollectDraft();
        let details = companyDetails;
        if (!details) {
          try {
            details = (await getCompanyDetailsAction()) ?? null;
            if (details) setCompanyDetails(details);
          } catch {
            details = null;
          }
        }
        const snapshot = buildPosSaleReceiptSnapshot({
          lines: [],
          payments,
          customer,
          company: details,
          posContext: posCtx,
          appliedPromotions: [],
          orderDiscount: 0,
          lineDiscountsTotal: 0,
          totals: {
            net: 0,
            gross: 0,
            taxes: 0,
            discounts: 0,
            saleTotal: collectQuotaTotal,
            appliedTotal,
            overpay,
          },
          methodsById,
          loadedQuotation: null,
          saleFolio: quotaRes.documentNumber,
          documentKind: "sale",
          quotaCollection: quotaRes.allocations.map((a) => ({
            folio: a.documentNumber,
            dueDate: collectQuotas.find((q) => q.id === a.installmentId)?.dueDate ?? null,
            amount: a.amount,
          })),
          operatorName: posOperatorName,
        });
        setReceiptData(snapshot);
        setConfirmLoading(false);
        emitKaiScreenSaleCompleted();
        setSuccessOpen(true);
        return;
      } catch (e) {
        setConfirmLoading(false);
        setPageAlert(e instanceof Error ? e.message : "No se pudo registrar el cobro de cuotas.");
        return;
      }
    }

    if (isCollectMode) {
      const customerId = customer?.customerId?.trim();
      if (!customerId) {
        setConfirmLoading(false);
        setPageAlert("Cliente requerido para el cobro.");
        return;
      }
      try {
        const collectRes = await collectPendingSalesFromPosAction(
          buildCollectPendingSalesClientPayload({
            pointOfSaleId,
            cashSessionId,
            customerId,
            saleTransactionIds: collectSales.map((s) => s.id),
            payments,
          }),
        );
        if (!collectRes.success) {
          setConfirmLoading(false);
          setPageAlert(collectRes.message);
          return;
        }
        clearPosArCollectDraft();
        let details = companyDetails;
        if (!details) {
          try {
            details = (await getCompanyDetailsAction()) ?? null;
            if (details) setCompanyDetails(details);
          } catch {
            details = null;
          }
        }
        const snapshot = buildPosSaleReceiptSnapshot({
          lines: [],
          payments,
          customer,
          company: details,
          posContext: posCtx,
          appliedPromotions: [],
          orderDiscount: 0,
          lineDiscountsTotal: 0,
          totals: {
            net: 0,
            gross: 0,
            taxes: 0,
            discounts: 0,
            saleTotal: collectBalanceTotal,
            appliedTotal,
            overpay,
          },
          methodsById,
          loadedQuotation: null,
          saleFolio: collectRes.documentNumber,
          documentKind: "sale",
          arCollection: collectRes.allocations.map((a) => ({
            folio: a.documentNumber,
            amount: a.amount,
          })),
          operatorName: posOperatorName,
        });
        setReceiptData(snapshot);
        setConfirmLoading(false);
        emitKaiScreenSaleCompleted();
        setSuccessOpen(true);
        return;
      } catch (e) {
        setConfirmLoading(false);
        setPageAlert(e instanceof Error ? e.message : "No se pudo registrar el cobro.");
        return;
      }
    }

    if (isReturnMode && immediateReturnRefund) {
      if (!loadedReturnSale?.id?.trim()) {
        setConfirmLoading(false);
        setPageAlert("Vincula la venta origen de la devolución.");
        return;
      }
      try {
        const refundPayload = buildConfirmCustomerReturnRefundPayload({
          pointOfSaleId,
          cashSessionId,
          originalSaleId: loadedReturnSale.id,
          cartLines: cart.lines,
          payments,
          customer,
          appliedPromotions,
          appliedTotal,
          overpay,
        });
        const refundRes = await confirmCustomerReturnRefundAction(refundPayload);
        if (!refundRes.success) {
          setConfirmLoading(false);
          setPageAlert(refundRes.message);
          return;
        }
        let details = companyDetails;
        if (!details) {
          try {
            details = (await getCompanyDetailsAction()) ?? null;
            if (details) setCompanyDetails(details);
          } catch {
            details = null;
          }
        }
        const refundPaymentLabels = payments
          .filter((p) => (Number(p.amount) || 0) > 0)
          .map((p) => {
            const cfg = p.companyPaymentMethodId
              ? methodsById.get(p.companyPaymentMethodId)
              : null;
            const label = cfg?.label ?? paymentMethodLabelEs(p.type);
            return { label, amount: Math.round(Number(p.amount) || 0) };
          });
        const ncSnapshot = buildCustomerCreditNotePrintSnapshot({
          creditNote: refundRes.creditNote,
          saleReturn: refundRes.saleReturn,
          originalSale: refundRes.originalSale,
          cartLines: cart.lines,
          customer,
          company: details,
          posContext: posCtx,
          lineDiscountsTotal,
          refundMode: "immediate",
          refundPayments: refundPaymentLabels,
        });
        setCreditNotePrintData(ncSnapshot);
        setConfirmLoading(false);
        setCreditNoteSuccessOpen(true);
        return;
      } catch (e) {
        setConfirmLoading(false);
        setPageAlert(
          e instanceof Error ? e.message : "No se pudo registrar el reembolso con nota de crédito.",
        );
        return;
      }
    }

    if (isReturnDocumentMode) {
      if (!loadedReturnSale?.id?.trim()) {
        setConfirmLoading(false);
        setPageAlert("Vincula la venta origen de la devolución.");
        return;
      }
      try {
        const returnPayload = buildConfirmCustomerReturnDocumentPayload({
          pointOfSaleId,
          cashSessionId,
          originalSaleId: loadedReturnSale.id,
          cartLines: cart.lines,
          customer,
          appliedPromotions,
        });
        const returnRes = await confirmCustomerReturnDocumentAction(returnPayload);
        if (!returnRes.success) {
          setConfirmLoading(false);
          setPageAlert(returnRes.message);
          return;
        }
        let details = companyDetails;
        if (!details) {
          try {
            details = (await getCompanyDetailsAction()) ?? null;
            if (details) setCompanyDetails(details);
          } catch {
            details = null;
          }
        }
        const ncSnapshot = buildCustomerCreditNotePrintSnapshot({
          creditNote: returnRes.creditNote,
          saleReturn: returnRes.saleReturn,
          originalSale: returnRes.originalSale,
          cartLines: cart.lines,
          customer,
          company: details,
          posContext: posCtx,
          lineDiscountsTotal,
          refundMode: "document",
        });
        setCreditNotePrintData(ncSnapshot);
        setConfirmLoading(false);
        setCreditNoteSuccessOpen(true);
        return;
      } catch (e) {
        setConfirmLoading(false);
        setPageAlert(
          e instanceof Error ? e.message : "No se pudo registrar la devolución con nota de crédito.",
        );
        return;
      }
    }

    const isSimpleSaleMode =
      !isEncargoMode &&
      !isCollectMode &&
      !isQuotaMode &&
      !isNcPayoutMode &&
      !isReturnMode &&
      !isReturnDocumentMode;

    let cartLinesForSale = cart.lines;
    let fiscalBoletaDegradedMessage: string | null = null;
    if (isSimpleSaleMode) {
      const priceListId = posCtx?.priceListId?.trim();
      if (priceListId) {
        cartLinesForSale = await hydrateCartLinesFiscalFlags(
          cart.lines,
          pointOfSaleId,
          priceListId,
        );
        fiscalBoletaDegradedMessage = boletaReducedToTicketMessage(
          saleDteKind,
          cartLinesForSale,
        );
      }
    }
    const effectiveSaleDocumentKind = isSimpleSaleMode
      ? resolveEffectiveSaleDocumentKind(saleDteKind, cartLinesForSale)
      : saleDteKind;

    if (
      isSimpleSaleMode &&
      saleDteKind === "BOLETA" &&
      cartLinesForSale.some((line) => line.requiresDte == null)
    ) {
      setConfirmLoading(false);
      setPageAlert(
        "No se pudo clasificar el perfil fiscal de uno o más productos. Sincroniza el catálogo e intenta de nuevo.",
      );
      return;
    }

    if (isSimpleSaleMode && !backendReachable) {
      const usedPayments = payments.filter((p) => (Number(p.amount) || 0) > 0);
      const offlineAllowed = usedPayments.every(
        (p) =>
          (p.type === "CASH" || p.type === "DEBIT_CARD" || p.type === "CREDIT_CARD") &&
          !p.paymentGatewayIntentId?.trim(),
      );
      if (!offlineAllowed) {
        setConfirmLoading(false);
        setPageAlert(
          "Sin conexión: solo ventas con efectivo o tarjeta manual (sin pasarela).",
        );
        return;
      }

      try {
        const priceListId = posCtx?.priceListId?.trim();
        if (!priceListId) {
          setConfirmLoading(false);
          setPageAlert("Sin lista de precios en el contexto POS.");
          return;
        }

        const catalogReady = await assertCatalogReady(pointOfSaleId, priceListId);
        if (!catalogReady.ready) {
          setConfirmLoading(false);
          setPageAlert(catalogReady.message ?? "Catálogo offline no disponible.");
          return;
        }

        const pack = saleDteKind === "BOLETA" ? await getStoredFiscalPack(pointOfSaleId) : null;
        const offlineCartLines = cartLinesForSale.map((l) => ({ ...l, discount: null }));
        const offlineTotals = computePosSaleTotals(offlineCartLines, 0);

        const committed = await commitOfflineSale({
          pointOfSaleId,
          cashSessionId,
          priceListId,
          cartLines: offlineCartLines,
          payments,
          customer,
          appliedPromotions: [],
          appliedTotal,
          overpay,
          saleDocumentKind: saleDteKind,
          fiscalPack: pack,
          fiscalPackExpired: pack ? isFiscalPackExpired(pack) : false,
          operatorName: posOperatorName,
          loadedQuotation: cart.loadedQuotation,
          loadedPresaleTickets: loadedPresaleTickets.map((t) => ({ id: t.id, code: t.code })),
          orderDiscount: 0,
        });

        const {
          localDocumentNumber,
          fiscalPrintPreview,
          fiscalFolio,
          boletaSkippedMessage,
        } = committed;

        let details = companyDetails;
        if (!details) {
          const pack = await getStoredFiscalPack(pointOfSaleId);
          if (pack?.emisor) {
            details = companyDetailsFromFiscalPackEmisor(pack.emisor);
          } else {
            try {
              details = (await getCompanyDetailsAction()) ?? null;
              if (details) setCompanyDetails(details);
            } catch {
              details = null;
            }
          }
        }

        const snapshot = buildSaleReceiptWithPrintPlan({
          snapshotInput: {
            lines: offlineCartLines,
            payments,
            customer,
            company: details,
            posContext: posCtx,
            appliedPromotions: [],
            orderDiscount: 0,
            lineDiscountsTotal: 0,
            totals: {
              net: offlineTotals.net,
              gross: offlineTotals.gross,
              taxes: offlineTotals.taxes,
              discounts: 0,
              saleTotal: offlineTotals.saleTotal,
              appliedTotal,
              overpay,
            },
            methodsById,
            loadedQuotation,
            saleFolio: localDocumentNumber,
            fiscalFolio,
            fiscalPrintPreview,
            fiscalBoletaWarning: boletaSkippedMessage
              ? `${boletaSkippedMessage} Pendiente de sincronización.`
              : fiscalBoletaDegradedMessage
                ? `${fiscalBoletaDegradedMessage} Pendiente de sincronización.`
                : "Venta guardada localmente. Se sincronizará al reconectar.",
            documentKind: "sale",
            operatorName: posOperatorName,
          },
          saleDocumentKind: saleDteKind,
          totals: {
            net: offlineTotals.net,
            gross: offlineTotals.gross,
            taxes: offlineTotals.taxes,
            discounts: 0,
            saleTotal: offlineTotals.saleTotal,
            orderDiscount: 0,
            lineDiscountsTotal: 0,
          },
        });
        setReceiptData(snapshot);
        setConfirmLoading(false);
        emitKaiScreenSaleCompleted();
        setSuccessOpen(true);
        return;
      } catch (e) {
        setConfirmLoading(false);
        setPageAlert(e instanceof Error ? e.message : "No se pudo registrar la venta offline.");
        return;
      }
    }

    const confirmRes = isEncargoMode
      ? await (async () => {
          if (!backorderDeposit) {
            return { success: false as const, message: "Define el abono de encargo." };
          }
          const depositAmount = Math.max(0, Math.round(backorderDeposit.amount));
          // Encargo sin abono: no enviar medios de pago (evita validación "todos cero").
          const paymentsForBackorder = depositAmount > 0 ? payments : [];
          const backorderPayload = buildCreateBackorderClientPayload({
            pointOfSaleId,
            cashSessionId,
            cartLines: cart.lines,
            payments: paymentsForBackorder,
            customer,
            appliedPromotions,
            appliedTotal: depositAmount > 0 ? appliedTotal : 0,
            overpay: depositAmount > 0 ? overpay : 0,
            backorderDepositAmount: depositAmount,
            backorderDepositPercent: Math.max(0, Math.round(backorderDeposit.percent)),
          });
          return createBackorderFromPosAction(backorderPayload);
        })()
      : await createSaleFromPosAction(
          buildCreateSaleClientPayload({
            pointOfSaleId,
            cashSessionId,
            cartLines: cartLinesForSale,
            payments,
            customer,
            appliedPromotions,
            appliedTotal,
            overpay,
            fulfillBackorderId: isFulfillBackorderMode
              ? loadedBackorder?.id ?? null
              : null,
            fulfillPresaleTicketIds: loadedPresaleTickets.map((t) => t.id),
            loadedPresaleTickets,
            loadedQuotation: cart.loadedQuotation,
            saleDocumentKind: effectiveSaleDocumentKind,
            selectedSaleDocumentKind: saleDteKind,
            posDelivery:
              canUsePosDelivery && posDelivery && !isEncargoMode
                ? posDelivery
                : null,
            diningOrderId: loadedDiningOrder?.id ?? null,
          }),
        );

    if (!confirmRes.success) {
      setConfirmLoading(false);
      const msg = confirmRes.message ?? "No se pudo confirmar la venta";
      if (/BOLETA no disponible/i.test(msg)) {
        setSaleDteKind(DEFAULT_SALE_DTE_KIND);
        setPageAlert(`${msg}. Se usará ticket interno.`);
        return;
      }
      setPageAlert(msg);
      return;
    }

    if (loadedDiningOrder?.id && !isEncargoMode && confirmRes.success) {
      void closePosDiningOrderAction({
        orderId: loadedDiningOrder.id,
        linkedTransactionId: confirmRes.transactionId,
      });
      clearLoadedDiningOrder();
    }

    if (saleCustomerId && !isEncargoMode) {
      void loadPaymentSources(saleCustomerId);
    }

    let details = companyDetails;
    if (!details) {
      try {
        details = (await getCompanyDetailsAction()) ?? null;
        if (details) setCompanyDetails(details);
      } catch {
        details = null;
      }
    }
    const fiscalEmission =
      confirmRes.success && "fiscalEmission" in confirmRes ? confirmRes.fiscalEmission : undefined;
    const snapshot = buildSaleReceiptWithPrintPlan({
      snapshotInput: {
        lines: cartLinesForSale,
        payments,
        customer,
        company: details,
        posContext: posCtx,
        appliedPromotions,
        orderDiscount,
        lineDiscountsTotal,
        totals: {
          net: totals.net,
          gross: totals.gross,
          taxes,
          discounts,
          saleTotal: amountToPay,
          appliedTotal: appliedTotal,
          overpay,
        },
        methodsById,
        loadedQuotation,
        saleFolio: confirmRes.success ? confirmRes.documentNumber : undefined,
        transactionId: confirmRes.success ? confirmRes.transactionId : undefined,
        fiscalFolio:
          fiscalEmission?.folio != null &&
          (fiscalEmission.status === "PENDING" ||
            fiscalEmission.status === "SENT" ||
            fiscalEmission.status === "EPR")
            ? String(fiscalEmission.folio)
            : null,
        fiscalPrintPreview:
          fiscalEmission?.printPreview &&
          (fiscalEmission.status === "PENDING" ||
            fiscalEmission.status === "SENT" ||
            fiscalEmission.status === "EPR")
            ? fiscalEmission.printPreview
            : null,
        fiscalBoletaWarning:
          fiscalBoletaDegradedMessage ??
          (fiscalEmission?.status === "FAILED"
            ? fiscalEmission.error?.trim() ||
              "Venta registrada; reintento de envío al SII en curso."
            : fiscalEmission?.status === "SKIPPED" &&
                fiscalEmission.skippedReason === "NO_DTE_LINES"
              ? boletaReducedToTicketMessage(saleDteKind, cartLinesForSale)
              : null),
        documentKind: isEncargoMode ? "backorder" : "sale",
        delivery:
          !isEncargoMode && canUsePosDelivery && posDelivery
            ? {
                zoneName: posDelivery.zoneName,
                shippingFee: Math.round(posDelivery.shippingFee),
                address: posDelivery.address,
              }
            : null,
        backorder:
          isEncargoMode && backorderDeposit
            ? {
                percent: backorderDeposit.percent,
                depositAmount: Math.round(backorderDeposit.amount),
                orderTotal: saleTotal,
              }
            : null,
        operatorName: posOperatorName,
      },
      saleDocumentKind: saleDteKind,
      totals: {
        net: totals.net,
        gross: totals.gross,
        taxes,
        discounts,
        saleTotal,
        orderDiscount,
        lineDiscountsTotal,
      },
    });
    setReceiptData(snapshot);
    setConfirmLoading(false);
    emitKaiScreenSaleCompleted();
    setSuccessOpen(true);
  };

  const customerLabel =
    customer?.name?.trim() ||
    (customer?.document?.trim() ? `Doc. ${customer.document.trim()}` : null) ||
    "no seleccionado";

  if (!cart.ready) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <DotProgress />
        <span>Cargando…</span>
      </div>
    );
  }

  if (!isDebtCollectMode && !isNcPayoutMode && cart.lines.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <DotProgress />
        <span>Volviendo al POS…</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-col gap-4 ${
        compactLayout ? "pb-[calc(14rem+env(safe-area-inset-bottom,0))]" : "pb-0"
      }`}
    >
      <PaymentDisplayPublisher
        enabled={showReturnRefundUi}
        lines={cart.lines}
        orderDiscount={orderDiscount ?? 0}
        amountDueLabel={amountDueLabel}
        amountToPay={amountToPay}
        appliedTotal={appliedTotal}
        remaining={remaining}
        overpay={overpay}
        paymentStatusLabel={paymentStatusLabel}
        customerName={customer?.name?.trim() || null}
        paymentLines={customerDisplayPaymentLines}
      />
      {/* Context bar (debajo del TopBar global). En compact el título/cliente
          vive en el card inferior fijo, entre los botones de volver y pagar. */}
      {!compactLayout ? (
      <header
        className="flex flex-row items-center gap-6 rounded-xl border border-border bg-background px-4 py-3 shadow-sm"
        aria-labelledby={saleTitleId}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!customerLocked && !compactLayout ? (
            <IconButton
              icon="ChevronLeft"
              variant="outlined"
              size="md"
              ariaLabel="Volver al POS"
              title="Volver al POS"
              onClick={() => {
                requestPosProductSearchFocus();
                goBackToPos();
              }}
              className="shrink-0"
              data-test-id="pos-payment-back"
            />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 id={saleTitleId} className="truncate text-base font-semibold text-foreground">
              {flowTitle}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {loadedReturnSale ? (
                <>
                  Venta origen:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {loadedReturnSale.documentNumber}
                  </span>
                  {" · "}
                </>
              ) : null}
              Cliente: <span className="font-medium text-foreground">{customerLabel}</span>
            </p>
          </div>
          {showDeliveryCard ? (
            <PosDeliverySummaryCard
              posDelivery={canUsePosDelivery ? posDelivery : null}
              disabled={deliveryConfigureDisabled}
              disabledReason={deliveryDisabledReason}
              onConfigure={() => setDeliveryDialogOpen(true)}
              data-test-id="pos-payment-delivery"
            />
          ) : null}
        </div>

        {!compactLayout && showReturnRefundUi ? (
          <div
            className="flex shrink-0 flex-wrap items-stretch gap-2 text-sm"
            data-test-id="pos-payment-summary"
          >
          <div className="flex min-w-32 flex-col rounded-lg bg-slate-100/80 px-3 py-2 dark:bg-slate-800/40">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base">{amountDueLabel}</span>
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 sm:text-2xl">
              {formatMoney(amountToPay)}
            </span>
          </div>
          <div className="flex min-w-32 flex-col rounded-lg bg-sky-100/70 px-3 py-2 dark:bg-sky-900/30">
            <span className="text-sm font-medium text-sky-700 dark:text-sky-300 sm:text-base">Total recibido</span>
            <span
              className="text-xl font-bold tabular-nums text-sky-900 dark:text-sky-100 sm:text-2xl"
              data-test-id="pos-payment-applied-total"
            >
              {formatMoney(appliedTotal)}
            </span>
          </div>
          {remaining > 0 ? (
            <div className="flex min-w-32 flex-col rounded-lg bg-amber-100/70 px-3 py-2 dark:bg-amber-900/30">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300 sm:text-base">Saldo restante</span>
              <span className="text-xl font-bold tabular-nums text-amber-900 dark:text-amber-100 sm:text-2xl">
                {formatMoney(remaining)}
              </span>
            </div>
          ) : null}
          {overpay > 0 ? (
            <div className="flex min-w-32 flex-col rounded-lg bg-emerald-100/70 px-3 py-2 dark:bg-emerald-900/30">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 sm:text-base">Vuelto</span>
              <span className="text-xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100 sm:text-2xl">
                {formatMoney(overpay)}
              </span>
            </div>
          ) : null}
          <div
            className={`flex min-w-32 flex-col rounded-lg px-3 py-2 ${paymentStatusBoxTone}`}
          >
            <span className="text-sm font-medium opacity-80 sm:text-base">Estado del pago</span>
            <span className="text-xl font-bold sm:text-2xl">{paymentStatusLabel}</span>
          </div>
          </div>
        ) : null}

        <div className={`shrink-0 items-center gap-2 ${compactLayout ? "hidden" : "flex"}`}>
          {showDeferPaymentButton ? (
            <IconButton
              icon="BanknoteX"
              variant="outlined"
              size="lg"
              className="shrink-0"
              ariaLabel="Emitir venta sin pago (cobro pendiente)"
              title="Emitir venta sin pago (cobro pendiente)"
              disabled={deferLoading || confirmLoading}
              isLoading={deferLoading}
              onClick={() => void handleDeferPaymentSale()}
              data-test-id="pos-payment-defer-desktop"
            />
          ) : null}
          <IconButton
            icon={confirmCtaIcon}
            variant="primary"
            size="lg"
            className="shrink-0"
            ariaLabel={confirmCtaAriaLabel}
            title={confirmPaymentTitle}
            disabled={confirmPaymentDisabled}
            isLoading={confirmLoading}
            onClick={() => void handleConfirm()}
            data-test-id={
              isReturnDocumentMode
                ? "pos-return-confirm-document-desktop"
                : "pos-payment-confirm-desktop"
            }
          />
        </div>
      </header>
      ) : null}

      {pageAlert ? (
        <Alert variant="error">
          <strong className="block font-semibold">No se puede confirmar</strong>
          <span className="mt-1 block text-sm">{pageAlert}</span>
        </Alert>
      ) : null}

      <div
        className={`grid items-stretch ${
          compactLayout
            ? "grid-cols-1 gap-2"
            : `gap-4 ${
                showReturnRefundUi
                  ? showDiningPanel
                    ? "grid-cols-4"
                    : "grid-cols-3"
                  : "grid-cols-2"
              }`
        }`}
      >
        {/* Columna 1 — Carrito */}
        <section
          className={`flex min-h-0 w-full min-w-0 flex-col rounded-xl border ${
            compactLayout && !saleSummaryOpen ? "gap-1 px-3 py-2" : "gap-3 p-4"
          } ${
            isEncargoMode || isFulfillBackorderMode
              ? "border-secondary/40 bg-secondary/10"
              : stockBlocksSalePayment
                ? POS_INSUFFICIENT_STOCK_SURFACE_CLASS
                : "border-border bg-background"
          }`}
          style={
            !compactLayout || saleSummaryOpen
              ? { height: `${paymentPanelVh}vh` }
              : undefined
          }
          aria-label={summarySectionLabel}
          data-test-id="pos-payment-cart-summary"
          data-stock-insufficient={stockBlocksSalePayment ? "true" : undefined}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {compactLayout ? (
                <IconButton
                  icon={saleSummaryOpen ? "ChevronDown" : "ChevronRight"}
                  variant="action"
                  size="sm"
                  ariaLabel={
                    saleSummaryOpen
                      ? "Contraer resumen de venta"
                      : "Expandir resumen de venta"
                  }
                  title={saleSummaryOpen ? "Contraer" : "Expandir"}
                  onClick={() => setSaleSummaryOpen((open) => !open)}
                  data-test-id="pos-payment-sale-summary-toggle"
                />
              ) : null}
              <h2 className="min-w-0 text-sm font-semibold text-foreground">
                {summarySectionLabel}
              </h2>
            </div>
            {!compactLayout || saleSummaryOpen ? (
              <>
            {isReturnMode ? (
              <div
                className="flex shrink-0 items-center justify-end"
                data-test-id="pos-return-immediate-refund-switch"
              >
                <Switch
                  checked={immediateReturnRefund}
                  onChange={setImmediateReturnRefund}
                  label="Reembolso inmediato"
                  labelPosition="left"
                />
              </div>
            ) : isNcPayoutMode ? (
              <span className="text-xs text-muted-foreground">
                {ncPayoutCreditNotes.length} nota(s) de crédito · 100 % del disponible
              </span>
            ) : isQuotaMode ? (
              <span className="text-xs text-muted-foreground">
                {collectQuotas.length} cuota(s) seleccionada(s)
              </span>
            ) : isCollectMode ? (
              <span className="text-xs text-muted-foreground">
                {collectSales.length} venta(s) seleccionada(s)
              </span>
            ) : isFulfillBackorderMode ? (
              loadedBackorder ? (
                <span
                  className="max-w-full truncate text-xs text-muted-foreground"
                  data-test-id="pos-payment-backorder-banner"
                >
                  Encargo{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {loadedBackorder.documentNumber}
                  </span>
                  {" · "}
                  Abono {formatMoney(loadedBackorder.depositAvailable)}
                </span>
              ) : null
            ) : (
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {quotationsEnabled && !isEncargoMode ? (
                  <IconButton
                    icon="File"
                    variant="outlined"
                    size="sm"
                    onClick={openSaveQuotation}
                    disabled={cart.lines.length === 0}
                    ariaLabel="Cotización"
                    title={
                      cart.lines.length === 0
                        ? "Agregue ítems al carrito"
                        : "Guardar como cotización"
                    }
                    data-test-id="pos-payment-save-quotation-btn"
                    className="shrink-0"
                  />
                ) : null}
                <IconButton
                  icon="Package"
                  variant={encargoModeEnabled ? "secondary" : "outlined"}
                  size="sm"
                  onClick={handleToggleEncargoMode}
                  disabled={cart.lines.length === 0 || saleTotal <= 0}
                  ariaLabel="Encargo"
                  title={
                    encargoModeEnabled
                      ? "Desactivar encargo y volver a venta"
                      : "Activar encargo y definir abono"
                  }
                  aria-pressed={encargoModeEnabled}
                  data-test-id="pos-payment-encargo-btn"
                  className="shrink-0"
                />
                {backorderDeposit && encargoModeEnabled ? (
                  <span
                    className="max-w-[min(100%,10rem)] truncate text-xs font-semibold tabular-nums text-primary"
                    title={`Abono ${backorderDeposit.percent}% · ${formatMoney(backorderDeposit.amount)}`}
                    data-test-id="pos-payment-backorder-deposit-summary"
                  >
                    {formatMoney(backorderDeposit.amount)}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      ({backorderDeposit.percent}%)
                    </span>
                  </span>
                ) : null}
              </div>
            )}
              </>
            ) : null}
          </div>
          {!compactLayout || saleSummaryOpen ? (
            <>
          {collectInitError || ncPayoutInitError ? (
            <Alert variant="error" className="text-xs">
              {collectInitError || ncPayoutInitError}
            </Alert>
          ) : null}
          {saleSummaryAlert || stockBlocksSalePayment ? (
            <Alert variant="error" className="text-xs">
              {saleSummaryAlert || stockInsufficientSaleMessage}
            </Alert>
          ) : null}
          <ul
            className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background [scrollbar-gutter:stable]"
            data-test-id="pos-payment-cart-lines-readonly"
          >
            {isNcPayoutMode
              ? ncPayoutCreditNotes.map((nc) => (
                  <li
                    key={nc.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    data-test-id={`pos-nc-payout-row-${nc.id}`}
                  >
                    <span className="font-mono font-medium text-foreground">
                      {nc.documentNumber}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold">
                      {formatMoney(nc.availableAmount)}
                    </span>
                  </li>
                ))
              : isQuotaMode
              ? collectQuotas.map((quota) => (
                  <li
                    key={quota.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    data-test-id={`pos-collect-quota-${quota.id}`}
                  >
                    <span className="min-w-0 truncate font-mono font-medium text-foreground">
                      {quota.documentNumber ?? quota.transactionId ?? quota.id}
                      {quota.dueDate ? (
                        <span className="ml-2 font-sans text-xs text-muted-foreground">
                          vence {new Date(quota.dueDate).toLocaleDateString("es-CL")}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold">
                      {formatMoney(quota.amount)}
                    </span>
                  </li>
                ))
              : isCollectMode
              ? collectSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    data-test-id={`pos-collect-sale-${sale.id}`}
                  >
                    <span className="font-mono font-medium text-foreground">
                      {sale.documentNumber ?? sale.id}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold">
                      {formatMoney(sale.balanceDue)}
                    </span>
                  </li>
                ))
              : cart.lines.map((line) => {
                  const suggested = suggestedLineDiscounts[line.variantId] ?? null;
                  const applied = Boolean(
                    line.discount &&
                      suggested &&
                      line.discount.promotionId === suggested.promotionId &&
                      isPromotionSelected(suggested.promotionId, line.variantId),
                  );
                  const hasAppliedOnly = Boolean(line.discount) && !suggested;
                  return (
                    <PaymentCartReadOnlyRow
                      key={line.variantId}
                      line={line}
                      suggestedDiscount={suggested ?? line.discount ?? null}
                      applied={applied || hasAppliedOnly}
                      offline={isOffline}
                      onToggleDiscount={
                        !isOffline && suggested
                          ? () =>
                              togglePromotion(
                                suggested.promotionId,
                                line.variantId,
                              )
                          : undefined
                      }
                    />
                  );
                })}
            {deliveryFeeActive > 0 && posDelivery ? (
              <li
                className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5 text-sm"
                data-test-id="pos-payment-delivery-summary-row"
              >
                <span className="min-w-0 truncate text-foreground">
                  Reparto · {posDelivery.zoneName}
                </span>
                <span className="shrink-0 tabular-nums font-semibold">
                  {formatMoney(posDelivery.shippingFee)}
                </span>
              </li>
            ) : null}
          </ul>
          <footer className="shrink-0 space-y-2 border-t border-border pt-3 text-sm">
            {isDebtCollectMode || isNcPayoutMode || isEncargoMode ? (
              <div className="flex justify-between gap-4 pt-1 text-base font-semibold">
                <span className="text-foreground">{amountDueLabel}</span>
                <span className="tabular-nums text-foreground">{formatMoney(amountToPay)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Subtotal neto</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatMoney(totals.net)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatMoney(taxes)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {!isOffline && discounts > 0 ? (
                      <IconButton
                        icon="Info"
                        variant="action"
                        size="xs"
                        ariaLabel="Ver detalle de descuentos"
                        title="Ver detalle de descuentos"
                        onClick={() => setDiscountDetailOpen(true)}
                        data-test-id="pos-payment-summary-discounts-info"
                      />
                    ) : null}
                    Descuentos
                  </span>
                  <span
                    className="font-medium tabular-nums text-emerald-700 dark:text-emerald-300"
                    data-test-id="pos-payment-summary-discounts"
                  >
                    {isOffline
                      ? "No disponible offline"
                      : discounts > 0
                        ? `-${formatMoney(discounts)}`
                        : formatMoney(discounts)}
                  </span>
                </div>
                {!isOffline && suggestedOrderPromotions.length > 0
                  ? suggestedOrderPromotions.map((promo) => {
                      const selected = isPromotionSelected(promo.promotionId);
                      return (
                        <div
                          key={promo.promotionId}
                          className={`flex items-center justify-between gap-2 text-xs ${
                            selected
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-muted-foreground"
                          }`}
                          data-test-id={`pos-payment-order-promo-${promo.promotionId}`}
                        >
                          <span className="flex min-w-0 items-center gap-1">
                            <IconButton
                              icon={selected ? "CheckCircle2" : "Circle"}
                              variant="action"
                              size="xs"
                              ariaLabel={
                                selected
                                  ? "Quitar descuento del total"
                                  : "Aplicar descuento al total"
                              }
                              title={
                                selected
                                  ? "Quitar descuento"
                                  : "Aplicar descuento sugerido al total"
                              }
                              onClick={() => togglePromotion(promo.promotionId)}
                              data-test-id={`pos-payment-order-promo-toggle-${promo.promotionId}`}
                            />
                            <span className="truncate">
                              {promo.promotionName}
                              {!selected ? " (sugerido)" : ""}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            −{formatMoney(promo.amountDiscounted)}
                          </span>
                        </div>
                      );
                    })
                  : null}
                <div className="flex justify-between gap-4 pt-1 text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="tabular-nums text-foreground">{formatMoney(amountToPay)}</span>
                </div>
              </>
            )}
          </footer>
            </>
          ) : null}
        </section>

        {/* Columna 2 — Cliente (panel independiente, URL-driven). */}
        {compactLayout ? (
          <div className="flex flex-col gap-2" data-test-id="pos-payment-customer-collapsible">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2">
              <IconButton
                icon={customerPanelOpen ? "ChevronDown" : "ChevronRight"}
                variant="action"
                size="sm"
                ariaLabel={
                  customerPanelOpen ? "Contraer panel de cliente" : "Expandir panel de cliente"
                }
                title={customerPanelOpen ? "Contraer" : "Expandir"}
                onClick={() => setCustomerPanelOpen((open) => !open)}
                data-test-id="pos-payment-customer-toggle"
              />
              <h2 className="min-w-0 text-sm font-semibold text-foreground">Cliente</h2>
            </div>
            {customerPanelOpen ? (
              <PosCustomerSearchPanel
                initial={initialCustomerSearch}
                selectedCustomer={customer}
                onPick={pickSearchCustomer}
                onClearSelected={clearSaleCustomer}
                heightVh={paymentPanelVh}
                disabled={customerLocked}
                showAddCustomer={!customerLocked}
                onAddCustomerClick={() => setCreateCustomerOpen(true)}
                offlineMode={isOffline}
                clientFetchMode={!isOffline}
                activeOnly
                paymentSourcesSlot={
                  customer?.customerId?.trim() ? (
                    <PosCustomerPaymentSourcesPanel
                      sources={paymentSources}
                      loading={paymentSourcesLoading}
                      error={paymentSourcesError}
                      showOrderAdvances={false}
                      onApplyCreditNote={
                        showReturnRefundUi &&
                          !isReturnMode &&
                          !isDebtCollectMode &&
                          !isNcPayoutMode &&
                          !isEncargoMode
                          ? applyCreditNoteFromPanel
                          : undefined
                      }
                      usedCreditNoteIds={usedCreditNoteIds}
                      disabled={remaining <= 0.01 || stockBlocksSalePayment}
                    />
                  ) : null
                }
              />
            ) : null}
          </div>
        ) : (
        <PosCustomerSearchPanel
          initial={initialCustomerSearch}
          selectedCustomer={customer}
          onPick={pickSearchCustomer}
          onClearSelected={clearSaleCustomer}
          heightVh={paymentPanelVh}
          disabled={customerLocked}
          showAddCustomer={!customerLocked}
          onAddCustomerClick={() => setCreateCustomerOpen(true)}
          offlineMode={isOffline}
          clientFetchMode={!isOffline}
          activeOnly
          paymentSourcesSlot={
            customer?.customerId?.trim() ? (
              <PosCustomerPaymentSourcesPanel
                sources={paymentSources}
                loading={paymentSourcesLoading}
                error={paymentSourcesError}
                showOrderAdvances={false}
                onApplyCreditNote={
                  showReturnRefundUi &&
                    !isReturnMode &&
                    !isDebtCollectMode &&
                    !isNcPayoutMode &&
                    !isEncargoMode
                    ? applyCreditNoteFromPanel
                    : undefined
                }
                usedCreditNoteIds={usedCreditNoteIds}
                disabled={remaining <= 0.01 || stockBlocksSalePayment}
              />
            ) : null
          }
        />
        )}

        {showDiningPanel ? (
          compactLayout ? (
            <div className="flex flex-col gap-2" data-test-id="pos-payment-dining-collapsible">
              <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2">
                <IconButton
                  icon={diningPanelOpen ? "ChevronDown" : "ChevronRight"}
                  variant="action"
                  size="sm"
                  ariaLabel={
                    diningPanelOpen ? "Contraer panel de cuentas" : "Expandir panel de cuentas"
                  }
                  title={diningPanelOpen ? "Contraer" : "Expandir"}
                  onClick={() => setDiningPanelOpen((open) => !open)}
                  data-test-id="pos-payment-dining-toggle"
                />
                <h2 className="min-w-0 text-sm font-semibold text-foreground">Cuentas</h2>
              </div>
              {diningPanelOpen ? (
                <PosDiningAccountsPanel
                  branchId={readPosContextClient()?.branchId?.trim() ?? ""}
                  heightVh={paymentPanelVh}
                  disabled={isOffline}
                />
              ) : null}
            </div>
          ) : (
            <PosDiningAccountsPanel
              branchId={readPosContextClient()?.branchId?.trim() ?? ""}
              heightVh={paymentPanelVh}
              disabled={isOffline}
            />
          )
        ) : null}

        {showReturnRefundUi ? (
        /* Columna 3 — Métodos de pago */
        <section
          className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          style={compactLayout ? undefined : { height: `${paymentPanelVh}vh` }}
          data-test-id="pos-payment-methods"
        >
          <div className="flex shrink-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton
                icon="Plus"
                variant="action"
                size="sm"
                ariaLabel="Agregar método de pago"
                onClick={openAddPayment}
                disabled={remaining <= 0.01 || stockBlocksSalePayment}
                title={
                  stockBlocksSalePayment
                    ? stockInsufficientSaleMessage
                    : "Agregar método de pago"
                }
                data-test-id="pos-payment-add-method"
              />
              <h2 className="shrink-0 text-sm font-semibold text-foreground">
                Métodos de pago
              </h2>
              {!compactLayout && showSaleDteSelector && saleDteLoaded ? (
                showSaleDteSelectorCompact ? (
                  <div
                    className="ml-auto w-36 shrink-0"
                    title={
                      saleDteOptions.find((o) => o.kind === saleDteKind)
                        ? effectiveDocumentOptionTitle(
                            saleDteOptions.find((o) => o.kind === saleDteKind)!,
                          )
                        : undefined
                    }
                  >
                    <Select
                      variant="minimal"
                      value={saleDteKind}
                      onChange={(id) => {
                        if (id == null) return;
                        setSaleDteKind(String(id) as SaleDteKind);
                      }}
                      options={saleDteSelectOptions}
                      disabled={saleDteSelectOptions.every((o) => o.disabled)}
                      data-test-id="pos-payment-sale-dte"
                    />
                  </div>
                ) : (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {saleDteSelectOptions.find((o) => o.id === saleDteKind)?.label ?? "Ticket"}
                  </span>
                )
              ) : null}
            </div>
            {compactLayout && showSaleDteSelector && saleDteLoaded ? (
              showSaleDteSelectorCompact ? (
                <div
                  className="w-full"
                  title={
                    saleDteOptions.find((o) => o.kind === saleDteKind)
                      ? effectiveDocumentOptionTitle(
                          saleDteOptions.find((o) => o.kind === saleDteKind)!,
                        )
                      : undefined
                  }
                >
                  <Select
                    variant="minimal"
                    value={saleDteKind}
                    onChange={(id) => {
                      if (id == null) return;
                      setSaleDteKind(String(id) as SaleDteKind);
                    }}
                    options={saleDteSelectOptions}
                    disabled={saleDteSelectOptions.every((o) => o.disabled)}
                    data-test-id="pos-payment-sale-dte-mobile"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {saleDteSelectOptions.find((o) => o.id === saleDteKind)?.label ?? "Ticket"}
                </span>
              )
            ) : null}
            {(canOfferInternalCredit && internalCreditCtx.paymentMethodId) ||
            (posPointEnabled && !cashOutRefundOnly && !isDebtCollectMode) ? (
              <div className="flex flex-wrap items-center gap-2">
                {canOfferInternalCredit && internalCreditCtx.paymentMethodId ? (
                  <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    disabled={stockBlocksSalePayment}
                    onClick={() => openInternalCreditDialog(existingInternalCreditLine?.id)}
                    data-test-id="pos-payment-add-internal-credit"
                  >
                    {existingInternalCreditLine ? "Editar crédito" : "Crédito interno"}
                  </Button>
                ) : null}
                {posPointEnabled && !cashOutRefundOnly && !isDebtCollectMode ? (
                  <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    disabled={remaining <= 0.01 || stockBlocksSalePayment || mpPointBusy}
                    onClick={() => void collectWithMpPoint()}
                    data-test-id="pos-payment-mp-point"
                  >
                    {mpPointBusy ? (
                      "Point…"
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Cobrar con
                        <MercadoPagoLogo width={110} />
                      </span>
                    )}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {mpPointStatus ? (
            <p className="text-xs text-muted-foreground">{mpPointStatus}</p>
          ) : null}

          {canOfferInternalCredit ? (
            <p
              className="text-xs text-muted-foreground"
              data-test-id="pos-payment-credit-banner"
            >
              Crédito disponible:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(customerAvailableCredit)}
              </span>
              {" · "}
              Restante venta:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(remaining)}
              </span>
            </p>
          ) : null}

          {paymentMethodsAlert ? (
            <Alert variant="error" className="text-xs">
              {paymentMethodsAlert}
            </Alert>
          ) : null}

          {effectiveError ? (
            <Alert variant="warning" className="text-xs">
              {effectiveError} (usando catálogo por defecto)
            </Alert>
          ) : null}
          <ul className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pt-4 pr-1">
            {payments.map((p, index) => {
              const cfg = p.companyPaymentMethodId
                ? methodsById.get(p.companyPaymentMethodId)
                : null;
              const label = cfg?.label ?? paymentMethodLabelEs(p.type);
              const ncId = p.creditNoteTransactionId?.trim();
              const ncRow = ncId
                ? paymentSources.creditNotes.find((n) => n.id === ncId)
                : null;
              return (
                <PosPaymentMethodCard
                  key={p.id}
                  payment={p}
                  index={index}
                  label={label}
                  planSubtitle={
                    p.internalCreditPlan
                      ? formatInternalCreditPlanSubtitle(p.internalCreditPlan)
                      : null
                  }
                  onEditInternalCredit={
                    p.type === "INTERNAL_CREDIT"
                      ? () => openInternalCreditDialog(p.id)
                      : undefined
                  }
                  creditNoteSourceBalance={ncRow?.availableAmount ?? null}
                  amountLocked={isFulfillBackorderAdvanceLine(p)}
                  remaining={remaining}
                  confirmLoading={confirmLoading}
                  paymentsCount={payments.length}
                  showRefField={showsRefField(p)}
                  bankAccountOptions={bankAccountOptions}
                  onUpdateAmount={updatePaymentLineAmount}
                  onFillRemaining={fillNonCashLineBalance}
                  onClearAmount={clearPaymentLineAmount}
                  onRemove={removePayment}
                  onUpdateBankAccountKey={updatePaymentLineBankAccountKey}
                  onUpdateReference={updatePaymentLineReference}
                  onUpdateCheckField={updatePaymentLineCheckField}
                  onUpdateVoucherField={updatePaymentLineVoucherField}
                  voucherKind={cfg?.voucherKind ?? null}
                  desktopLayout={!compactLayout}
                  bankAccountPrintLoading={bankAccountPrintLineId === p.id}
                  onPrintBankAccount={
                    p.type === "TRANSFER" && p.bankAccountKey?.trim()
                      ? () => void handlePrintBankAccount(p.id)
                      : undefined
                  }
                  onConfirmEnter={confirmPaymentFromField}
                />
              );
            })}
          </ul>
        </section>
        ) : null}
      </div>

      {/* Móvil: card fijo con resumen de cobro + acciones */}
      {compactLayout ? (
        showReturnRefundUi ? (
          <div
            className="fixed bottom-0 left-(--app-sidebar-width) right-0 z-30 border-t border-border bg-background/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            data-test-id="pos-payment-mobile-summary-card"
          >
            <div
              className="grid grid-cols-2 gap-2 p-3 text-sm"
              data-test-id="pos-payment-summary"
            >
              <div className="flex flex-col rounded-lg bg-slate-100/80 px-3 py-2 dark:bg-slate-800/40">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:text-sm">
                  {amountDueLabel}
                </span>
                <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 sm:text-xl">
                  {formatMoney(amountToPay)}
                </span>
              </div>
              <div className="flex flex-col rounded-lg bg-sky-100/70 px-3 py-2 dark:bg-sky-900/30">
                <span className="text-xs font-medium text-sky-700 dark:text-sky-300 sm:text-sm">
                  Total recibido
                </span>
                <span
                  className="text-lg font-bold tabular-nums text-sky-900 dark:text-sky-100 sm:text-xl"
                  data-test-id="pos-payment-applied-total"
                >
                  {formatMoney(appliedTotal)}
                </span>
              </div>
              {overpay > 0 ? (
                <div className="flex flex-col rounded-lg bg-emerald-100/70 px-3 py-2 dark:bg-emerald-900/30">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:text-sm">
                    Vuelto
                  </span>
                  <span className="text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-100 sm:text-xl">
                    {formatMoney(overpay)}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col rounded-lg bg-amber-100/70 px-3 py-2 dark:bg-amber-900/30">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300 sm:text-sm">
                    Saldo restante
                  </span>
                  <span className="text-lg font-bold tabular-nums text-amber-900 dark:text-amber-100 sm:text-xl">
                    {formatMoney(remaining)}
                  </span>
                </div>
              )}
              <div className={`flex flex-col rounded-lg px-3 py-2 ${paymentStatusBoxTone}`}>
                <span className="text-xs font-medium opacity-80 sm:text-sm">Estado del pago</span>
                <span className="text-lg font-bold sm:text-xl">{paymentStatusLabel}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
              {!customerLocked ? (
                <IconButton
                  icon="ChevronLeft"
                  variant="outlined"
                  size="lg"
                  ariaLabel="Volver al POS"
                  title="Volver al POS"
                  onClick={() => {
                    requestPosProductSearchFocus();
                    goBackToPos();
                  }}
                  className="shrink-0"
                  data-test-id="pos-payment-back-mobile"
                />
              ) : (
                <span className="w-10 shrink-0" aria-hidden />
              )}
              <div
                className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 text-center leading-tight"
                data-test-id="pos-payment-mobile-context"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {flowTitle}
                </span>
                <span className="max-w-full truncate text-xs text-muted-foreground">
                  Cliente:{" "}
                  <span className="font-medium text-foreground">{customerLabel}</span>
                </span>
                {showDeliveryCard ? (
                  <PosDeliverySummaryCard
                    compact
                    className="mt-0.5"
                    posDelivery={canUsePosDelivery ? posDelivery : null}
                    disabled={deliveryConfigureDisabled}
                    disabledReason={deliveryDisabledReason}
                    onConfigure={() => setDeliveryDialogOpen(true)}
                    data-test-id="pos-payment-delivery-mobile"
                  />
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {showDeferPaymentButton ? (
                  <IconButton
                    icon="BanknoteX"
                    variant="outlined"
                    size="lg"
                    className="shrink-0"
                    ariaLabel="Emitir venta sin pago (cobro pendiente)"
                    title="Emitir venta sin pago (cobro pendiente)"
                    disabled={deferLoading || confirmLoading}
                    isLoading={deferLoading}
                    onClick={() => void handleDeferPaymentSale()}
                    data-test-id="pos-payment-defer-mobile"
                  />
                ) : null}
                <IconButton
                  icon={confirmCtaIcon}
                  variant="primary"
                  size="lg"
                  className="shrink-0"
                  ariaLabel={confirmCtaAriaLabel}
                  title={confirmPaymentTitle}
                  disabled={confirmPaymentDisabled}
                  isLoading={confirmLoading}
                  onClick={() => void handleConfirm()}
                  data-test-id={
                    isReturnDocumentMode
                      ? "pos-return-confirm-document-mobile"
                      : "pos-payment-confirm-mobile"
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="fixed bottom-0 left-(--app-sidebar-width) right-0 z-30 flex items-center justify-between gap-2 border-t border-border bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            data-test-id="pos-payment-mobile-actions"
          >
            {!customerLocked ? (
              <IconButton
                icon="ChevronLeft"
                variant="outlined"
                size="lg"
                ariaLabel="Volver al POS"
                title="Volver al POS"
                onClick={() => {
                  requestPosProductSearchFocus();
                  goBackToPos();
                }}
                className="shrink-0"
                data-test-id="pos-payment-back-mobile"
              />
            ) : (
              <span className="w-10 shrink-0" aria-hidden />
            )}
            <div
              className="flex min-w-0 flex-1 flex-col items-center px-1 text-center leading-tight"
              data-test-id="pos-payment-mobile-context"
            >
              <span className="truncate text-sm font-semibold text-foreground">
                {flowTitle}
              </span>
              <span className="max-w-full truncate text-xs text-muted-foreground">
                Cliente: <span className="font-medium text-foreground">{customerLabel}</span>
              </span>
            </div>
            <IconButton
              icon={confirmCtaIcon}
              variant="primary"
              size="lg"
              className="shrink-0"
              ariaLabel={confirmCtaAriaLabel}
              title={confirmPaymentTitle}
              disabled={confirmPaymentDisabled}
              isLoading={confirmLoading}
              onClick={() => void handleConfirm()}
              data-test-id={
                isReturnDocumentMode
                  ? "pos-return-confirm-document-mobile"
                  : "pos-payment-confirm-mobile"
              }
            />
          </div>
        )
      ) : null}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Agregar método de pago"
        size="sm"
        alertArea={addAlert ? <Alert variant="error">{addAlert}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={addPayment}>
              Agregar
            </Button>
          </>
        }
        data-test-id="pos-payment-add-method-dialog"
      >
        <div className="grid gap-4">
          <Select
            label="Tipo de pago"
            alwaysShowLabel
            value={draftOptionId}
            onChange={(id) => setDraftOptionId(id != null ? String(id) : "")}
            options={paymentTypeOptions}
          />
          <TextField
            type="currency"
            label={draftPaymentAmountLabel}
            name="payment-amount"
            value={draftAmount}
            onChange={(e) => setDraftAmount(e.target.value)}
            placeholder={draftPaymentAmountLabel}
            alwaysShowLabel
            currencySymbol="$"
            required
            data-test-id="pos-payment-add-amount"
          />
          {(() => {
            const cfg = methodsById.get(draftOptionId);
            const enumType: PosPaymentMethodId =
              cfg ? (cfg.method as PosPaymentMethodId) : (draftOptionId as PosPaymentMethodId);
            if (enumType !== "TRANSFER") return null;
            if (bankAccountOptions.length === 0) return null;
            return (
              <Select
                label="Cuenta bancaria destino"
                placeholder="Cuenta bancaria destino"
                value={draftBankAccountKey || cfg?.bankAccountKey || null}
                onChange={(id) => setDraftBankAccountKey(id != null ? String(id) : "")}
                options={bankAccountOptions}
                alwaysShowLabel
                data-test-id="pos-payment-add-transfer-account"
              />
            );
          })()}
          {draftShowsRefField ? (
            <TextField
              label="Referencia"
              name="payment-ref"
              value={draftReference}
              onChange={(e) => setDraftReference(e.target.value)}
              alwaysShowLabel
              required
              data-test-id="pos-payment-add-reference"
            />
          ) : null}
        </div>
      </Dialog>

      <PosSaleReceiptDialog
        open={successOpen && receiptData != null}
        data={receiptData}
        onClose={() => {
          setSuccessOpen(false);
          setReceiptData(null);
          cart.clear();
          requestPosProductSearchFocus();
          goBackToPos();
        }}
      />

      <PosCustomerCreditNoteDialog
        open={creditNoteSuccessOpen && creditNotePrintData != null}
        data={creditNotePrintData}
        onClose={() => {
          setCreditNoteSuccessOpen(false);
          setCreditNotePrintData(null);
          cart.clear();
          exitReturnMode();
          requestPosProductSearchFocus();
          goBackToPos();
        }}
      />

      {quotationsEnabled ? (
      <SaveAsQuotationDialog
        open={saveQuotationOpen}
        onClose={() => setSaveQuotationOpen(false)}
        onSaved={() => {
          requestPosProductSearchFocus();
          goBackToPos();
        }}
      />
      ) : null}

      <BackorderDepositDialog
        open={backorderDepositOpen}
        onClose={() => setBackorderDepositOpen(false)}
        saleTotal={saleTotal}
        initial={backorderDeposit}
        onConfirm={handleBackorderDepositConfirm}
      />

      <PosDeliveryDialog
        open={deliveryDialogOpen}
        onClose={() => setDeliveryDialogOpen(false)}
        productSubtotal={saleTotal}
        initial={posDelivery}
        customerHint={
          customer
            ? { name: customer.name, phone: customer.phone }
            : null
        }
        onConfirm={(config: PosDeliveryConfig) => {
          setPosDelivery(config);
          setDeliveryDialogOpen(false);
        }}
        onClear={() => {
          clearPosDelivery();
          setDeliveryDialogOpen(false);
        }}
      />

      <PosCreateCustomerDialog
        open={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        internalCreditEnabled={internalCreditCtx.enabled}
        onSuccess={(info) => {
          setCustomer({
            customerId: info.customerId,
            name: info.displayName,
            document: info.documentNumber,
            phone: info.phone,
            email: info.email,
          });
        }}
      />

      {internalCreditCtx.paymentMethodId && saleCustomerId ? (
        <PosInternalCreditPaymentDialog
          open={internalCreditDialogOpen}
          onClose={() => {
            setInternalCreditDialogOpen(false);
            setEditingInternalCreditLineId(null);
          }}
          customerId={saleCustomerId}
          customerDisplayName={customerLabel}
          saleRemaining={remaining}
          paymentMethodId={internalCreditCtx.paymentMethodId}
          paymentMethodLabel={
            internalCreditCtx.paymentMethodLabel ?? "Crédito interno"
          }
          existingPayments={payments}
          editingLineId={editingInternalCreditLineId}
          initial={
            editingInternalCreditLineId
              ? payments.find((p) => p.id === editingInternalCreditLineId) ?? null
              : existingInternalCreditLine
          }
          onConfirm={handleInternalCreditConfirm}
        />
      ) : null}

      <PosDiscountDetailDialog
        open={discountDetailOpen}
        onClose={() => setDiscountDetailOpen(false)}
        appliedPromotions={appliedPromotions}
        lines={cart.lines}
        totalDiscount={discounts}
        promotions={cart.effectivePromotions}
        warnings={cart.promotionWarnings}
      />
    </div>
  );
}
