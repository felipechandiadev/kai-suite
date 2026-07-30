"use client";

import React from "react";
import styles from "./PurchaseOrderPrintDocument.module.css";

function formatMoneyClp(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function PrintDocumentMoneySummaryBlock({
  subtotalNeto,
  impuestosTotal,
  total,
  appliedTaxNames,
  notes,
  paymentSummary,
}: {
  subtotalNeto: number;
  impuestosTotal: number;
  total: number;
  appliedTaxNames: string[];
  notes?: string | null;
  /** Texto resumido de pagos (recepción / documento DTE); va debajo de Notas si existe nota. */
  paymentSummary?: string | null;
}) {
  const taxSuffix =
    appliedTaxNames.length > 0 ? ` (${appliedTaxNames.join(", ")})` : "";
  const notesTrim = notes != null ? String(notes).trim() : "";
  const paymentsTrim = paymentSummary != null ? String(paymentSummary).trim() : "";

  return (
    <>
      <div className={styles.printTotals} data-test-id="print-doc-money-summary">
        <div className={styles.printTotalsRow}>
          <span>Subtotal neto</span>
          <span className={styles.num}>{formatMoneyClp(subtotalNeto)}</span>
        </div>
        <div className={styles.printTotalsRow}>
          <span>
            Impuestos
            {taxSuffix}
          </span>
          <span className={styles.num}>{formatMoneyClp(impuestosTotal)}</span>
        </div>
        <div className={`${styles.printTotalsRow} ${styles.printTotalsTotalRow}`}>
          <span>Total</span>
          <span className={styles.num}>{formatMoneyClp(total)}</span>
        </div>
      </div>
      {notesTrim ? (
        <div className={styles.printNotesBlock} data-test-id="print-doc-notes">
          <p className={styles.printNotesLabel}>Notas</p>
          <p className={styles.printNotesBody}>{notesTrim}</p>
        </div>
      ) : null}
      {paymentsTrim ? (
        <div className={styles.printNotesBlock} data-test-id="print-doc-payments">
          <p className={styles.printNotesLabel}>Pagos</p>
          <p className={styles.printNotesBody}>{paymentsTrim}</p>
        </div>
      ) : null}
    </>
  );
}
