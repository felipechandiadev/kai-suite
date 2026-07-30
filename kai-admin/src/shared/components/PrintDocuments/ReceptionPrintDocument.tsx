"use client";

import React from "react";
import { PrintableDocumentLayout, type PrintableCompanyInfo } from "./PrintableDocumentLayout";
import { PrintDocumentMoneySummaryBlock } from "./PrintDocumentMoneySummaryBlock";
import type { SupplierPrintSummaryModel } from "./SupplierPrintSummaryBlock";
import { SupplierPrintSummaryBlock } from "./SupplierPrintSummaryBlock";
import styles from "./PurchaseOrderPrintDocument.module.css";

function formatDateSlash(value: string): string {
  const s = String(value || "").trim();
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) {
    return s;
  }
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function formatMoneyClp(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export type ReceptionPrintLine = {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type ReceptionPrintModel = {
  documentDate: string;
  /** Folio interno de la recepción (documento interno). */
  internalFolio?: string | null;
  storageLabel?: string | null;
  supplierPrint: SupplierPrintSummaryModel;
  lines: ReceptionPrintLine[];
  notes?: string | null;
  subtotalNeto: number;
  impuestosTotal: number;
  total: number;
  appliedTaxNames: string[];
  /** Resumen de pagos del documento fiscal (recepción). */
  paymentSummary?: string | null;
};

export function ReceptionPrintDocument({
  company,
  reception,
}: {
  company: PrintableCompanyInfo;
  reception: ReceptionPrintModel;
}) {
  const folioInterno = reception.internalFolio?.trim() ? reception.internalFolio.trim() : null;

  return (
    <PrintableDocumentLayout
      company={company}
      document={{
        title: "RECEPCIÓN DE COMPRA",
        issueDateLabel: "Fecha",
        issueDateValue: formatDateSlash(reception.documentDate),
        folioLabel: "Folio",
        folioValue: folioInterno,
      }}
    >
      <div className={styles.summaryGrid}>
        <SupplierPrintSummaryBlock model={reception.supplierPrint} />
        <div className={styles.field}>
          <p className={styles.label}>Almacén destino</p>
          <p className={styles.value}>{reception.storageLabel?.trim() ? reception.storageLabel : "—"}</p>
        </div>
      </div>

      <table className={styles.table} data-test-id="reception-print-lines">
        <thead className={styles.thead}>
          <tr>
            <th style={{ width: "4ch" }}>#</th>
            <th>Producto</th>
            <th style={{ width: "18ch" }}>SKU</th>
            <th className={styles.num} style={{ width: "10ch" }}>
              Cant.
            </th>
            <th className={styles.num} style={{ width: "14ch" }}>
              Precio
            </th>
            <th className={styles.num} style={{ width: "14ch" }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {reception.lines.map((l, idx) => {
            const qty = Number(l.quantity) || 0;
            const price = Number(l.unitPrice) || 0;
            const lineTotal = Math.round(qty * price);
            return (
              <tr key={`reception-print-line-${idx}`}>
                <td className={styles.muted}>{idx + 1}</td>
                <td>{l.productName}</td>
                <td className={styles.muted}>{l.sku}</td>
                <td className={styles.num}>{qty}</td>
                <td className={styles.num}>{formatMoneyClp(price)}</td>
                <td className={styles.num}>{formatMoneyClp(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PrintDocumentMoneySummaryBlock
        subtotalNeto={reception.subtotalNeto}
        impuestosTotal={reception.impuestosTotal}
        total={reception.total}
        appliedTaxNames={reception.appliedTaxNames}
        notes={reception.notes}
        paymentSummary={reception.paymentSummary}
      />
    </PrintableDocumentLayout>
  );
}
