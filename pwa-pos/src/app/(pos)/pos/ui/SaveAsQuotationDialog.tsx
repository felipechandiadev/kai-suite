"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { createQuotationPosAction } from "@/features/quotations/actions/quotations-pos.action";
import {
  buildQuotationDocumentHtml,
  printPosQuotationDocument,
} from "@/features/quotations/lib/quotation-document-print";
import {
  buildQuotationReceiptHtml,
  printPosQuotationReceipt,
  type QuotationReceiptPrintInput,
} from "@/features/quotations/lib/quotation-receipt-print";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { getCompanyQuotationSettingsAction } from "@/features/company/actions/company-quotations.action";
import {
  DEFAULT_COMPANY_QUOTATION_SETTINGS,
  type CompanyQuotationSettings,
} from "@/features/company/types/company-quotations.types";
import { PosPrintDocumentPreview } from "@/features/pos-print/ui/PosPrintDocumentPreview";
import {
  describePosDocumentPrintMode,
  getPosDocumentPrintMode,
  isPosDocumentPrintModeDocument,
  posDocumentPrintModeToWireFormat,
  PosDocumentPrintModeSelector,
  type PosDocumentPrintMode,
} from "@kai/print-service-client";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

type SavedQuotationPrintState = {
  input: QuotationReceiptPrintInput;
  printMode: PosDocumentPrintMode;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function SaveAsQuotationDialog({ open, onClose, onSaved }: Props) {
  const cart = usePosCart();
  const [quotationSettings, setQuotationSettings] = useState<CompanyQuotationSettings>(
    DEFAULT_COMPANY_QUOTATION_SETTINGS,
  );
  const [validityDays, setValidityDays] = useState(
    String(DEFAULT_COMPANY_QUOTATION_SETTINGS.defaultValidityDays),
  );
  const [notes, setNotes] = useState("");
  const [printMode, setPrintMode] = useState<PosDocumentPrintMode>("ticket");
  const [busy, setBusy] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Datos listos para imprimir / vista previa (mismo payload que la impresora). */
  const [savedPrint, setSavedPrint] = useState<SavedQuotationPrintState | null>(null);
  const printedQuotationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        setError(null);
        setSavedPrint(null);
        setBusy(false);
        setNotes("");
        setValidityDays(String(DEFAULT_COMPANY_QUOTATION_SETTINGS.defaultValidityDays));
        setQuotationSettings(DEFAULT_COMPANY_QUOTATION_SETTINGS);
        setPrintMode("ticket");
        printedQuotationIdRef.current = null;
      }, 0);
      return () => clearTimeout(id);
    }
    setPrintMode(getPosDocumentPrintMode("quotation"));
    let cancelled = false;
    setSettingsLoading(true);
    void getCompanyQuotationSettingsAction().then((settings) => {
      if (cancelled) return;
      setQuotationSettings(settings);
      setValidityDays(String(settings.defaultValidityDays));
      setSettingsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const input = savedPrint?.input;
    const mode = savedPrint?.printMode;
    const q = input?.quotation;
    if (!input || !q?.id || !mode) return;
    if (printedQuotationIdRef.current === q.id) return;
    printedQuotationIdRef.current = q.id;
    const format = posDocumentPrintModeToWireFormat(mode);
    const t = window.setTimeout(() => {
      if (isPosDocumentPrintModeDocument(mode)) {
        printPosQuotationDocument(input, format);
      } else {
        printPosQuotationReceipt(input, format);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [savedPrint]);

  const previewSrcDoc = useMemo(() => {
    if (!savedPrint || typeof window === "undefined") return null;
    const origin = window.location.origin;
    const format = posDocumentPrintModeToWireFormat(savedPrint.printMode);
    return isPosDocumentPrintModeDocument(savedPrint.printMode)
      ? buildQuotationDocumentHtml(savedPrint.input, format)
      : buildQuotationReceiptHtml(savedPrint.input, origin, format);
  }, [savedPrint]);

  const totals = cart.lines.reduce(
    (acc, l) => {
      const q = Number(l.quantity) || 0;
      const net = (Number(l.unitPrice) || 0) * q;
      const gross = (Number(l.unitPriceWithTax) || 0) * q;
      acc.net += net;
      acc.gross += gross;
      return acc;
    },
    { net: 0, gross: 0 },
  );

  async function handleSave() {
    setError(null);
    if (cart.lines.length === 0) {
      setError("El carrito está vacío.");
      return;
    }
    if (!cart.saleCustomer?.customerId?.trim()) {
      setError("Selecciona un cliente antes de guardar la cotización.");
      return;
    }
    const ctx = readPosContextClient();
    const branchId = ctx?.branchId?.trim();
    if (!branchId) {
      setError("No se pudo determinar la sucursal del punto de venta.");
      return;
    }

    let validUntil: string | undefined;
    const maxDays = quotationSettings.maxValidityDays;
    const defaultDays = quotationSettings.defaultValidityDays;
    const allowCustomValidity = quotationSettings.allowCustomValidity;
    const days = allowCustomValidity
      ? Math.max(1, parseInt(validityDays, 10) || defaultDays)
      : defaultDays;
    if (allowCustomValidity && days > maxDays) {
      setError(
        `La vigencia no puede superar ${maxDays} día(s) (límite configurado en la empresa).`,
      );
      return;
    }
    if (allowCustomValidity && days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 59, 999);
      validUntil = d.toISOString();
    }

    const customer = cart.saleCustomer;
    setBusy(true);
    const res = await createQuotationPosAction({
      branchId,
      pointOfSaleId: ctx?.pointOfSaleId ?? undefined,
      priceListId: ctx?.priceListId ?? undefined,
      customerId: customer?.customerId ?? undefined,
      customerName: customer?.name ?? undefined,
      customerDocument: customer?.document ?? undefined,
      customerPhone: customer?.phone ?? undefined,
      validUntil,
      notes: notes.trim() || undefined,
      currency: "CLP",
      lines: cart.lines.map((l) => {
        const quantity = Number(l.quantity) || 0;
        const unitPrice = Number(l.unitPrice) || 0;
        const unitPriceWithTax = Number(l.unitPriceWithTax) || unitPrice;
        const taxRate = Number(l.unitTaxRate) || 0;
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        const total = Number((unitPriceWithTax * quantity).toFixed(2));
        const taxAmount = Number(Math.max(0, total - subtotal).toFixed(2));
        return {
          productId: l.productId ?? undefined,
          productVariantId: l.variantId,
          unitId: l.unitId ?? undefined,
          productName: l.productName,
          productSku: l.sku ?? undefined,
          quantity,
          unitPrice,
          taxRate,
          taxAmount,
          subtotal,
          total,
        };
      }),
    });
    setBusy(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    const company = await getCompanyDetailsAction();
    const ctxAfter = readPosContextClient();
    setSavedPrint({
      input: {
        quotation: res.quotation,
        company,
        branchName: ctxAfter?.branchName ?? null,
        pointOfSaleName: ctxAfter?.pointOfSaleName ?? null,
      },
      printMode,
    });
  }

  function closeAndClear() {
    if (savedPrint) {
      cart.clear();
      onSaved?.();
    }
    onClose();
  }

  function handleReprint() {
    if (!savedPrint) return;
    const format = posDocumentPrintModeToWireFormat(savedPrint.printMode);
    if (isPosDocumentPrintModeDocument(savedPrint.printMode)) {
      printPosQuotationDocument(savedPrint.input, format);
    } else {
      printPosQuotationReceipt(savedPrint.input, format);
    }
  }

  const q = savedPrint?.input.quotation;

  return (
    <Dialog
      open={open}
      onClose={closeAndClear}
      title={savedPrint ? "Cotización emitida" : "Guardar como cotización"}
      size={savedPrint ? "lg" : "sm"}
      scroll={savedPrint ? "paper" : "body"}
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        savedPrint ? (
          <>
            <Button type="button" variant="outlined" onClick={handleReprint}>
              Imprimir de nuevo
            </Button>
            <Button type="button" variant="primary" onClick={closeAndClear}>
              Volver al POS
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outlined"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              loading={busy}
              disabled={busy || cart.lines.length === 0}
            >
              Emitir cotización
            </Button>
          </>
        )
      }
      actionsJustify="between"
      data-test-id="pos-save-quotation-dialog"
    >
      {savedPrint && q ? (
        <div className="grid gap-3 text-sm">
          <p className="text-xs text-muted-foreground">
            Modo:{" "}
            <span className="font-medium text-foreground">
              {describePosDocumentPrintMode(savedPrint.printMode)}
            </span>
          </p>
          <PosPrintDocumentPreview
            html={previewSrcDoc}
            format={posDocumentPrintModeToWireFormat(savedPrint.printMode)}
            title={
              isPosDocumentPrintModeDocument(savedPrint.printMode)
                ? "Vista previa cotización documento"
                : "Vista previa cotización ticket"
            }
            data-test-id="pos-save-quotation-receipt-preview"
          />
          <p className="text-xs text-muted-foreground">
            Los precios cotizados serán respetados al convertir esta cotización
            en venta, durante el período de vigencia, incluso si las listas de
            precios cambian.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ítems</span>
              <span className="font-medium">{cart.itemsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {formatMoney(totals.gross)}
              </span>
            </div>
            {cart.saleCustomer ? (
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{cart.saleCustomer.name}</span>
              </div>
            ) : null}
          </div>
          <PosDocumentPrintModeSelector
            value={printMode}
            onChange={setPrintMode}
            data-test-id="pos-save-quotation-print-mode"
          />
          {quotationSettings.allowCustomValidity ? (
            <TextField
              label={`Vigencia (días, máx. ${quotationSettings.maxValidityDays})`}
              type="number"
              min={1}
              max={quotationSettings.maxValidityDays}
              value={validityDays}
              onChange={(e) => {
                const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                if (raw.trim() === "") {
                  setValidityDays(raw);
                  return;
                }
                const parsed = Math.max(1, parseInt(raw, 10) || 1);
                setValidityDays(
                  String(Math.min(quotationSettings.maxValidityDays, parsed)),
                );
              }}
              disabled={settingsLoading || busy}
              data-test-id="pos-save-quotation-days"
            />
          ) : (
            <p className="text-sm text-muted-foreground" data-test-id="pos-save-quotation-days-fixed">
              Vigencia: {quotationSettings.defaultValidityDays} día(s) (fijada por la empresa).
            </p>
          )}
          <TextField
            label="Notas (opcional)"
            type="textarea"
            rows={4}
            value={notes}
            onChange={(e) =>
              setNotes(
                (e as React.ChangeEvent<HTMLTextAreaElement>).target.value,
              )
            }
            data-test-id="pos-save-quotation-notes"
          />
        </div>
      )}
    </Dialog>
  );
}
