"use client";

import React from "react";
import type { CreatePurchaseOrderLineInput } from "@/features/purchasing-document/types/purchase-order.types";
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

function attributeValuePartsForPrint(av: Record<string, string> | undefined): string[] {
  if (!av || typeof av !== "object") {
    return [];
  }
  return Object.values(av)
    .map((x) => String(x).trim())
    .filter(Boolean);
}

export type PurchaseOrderPrintModel = {
  id: string;
  documentNumber?: string | null;
  documentDate: string;
  storageLabel?: string | null;
  lines: CreatePurchaseOrderLineInput[];
  notes?: string | null;
  subtotalNeto: number;
  impuestosTotal: number;
  total: number;
  /** Nombres de impuestos aplicados en al menos una línea, sin repetir. */
  appliedTaxNames: string[];
  supplierPrint: SupplierPrintSummaryModel;
};

export function PurchaseOrderPrintDocument({
  company,
  order,
}: {
  company: PrintableCompanyInfo;
  order: PurchaseOrderPrintModel;
}) {
  return (
    <PrintableDocumentLayout
      company={company}
      document={{
        title: "ORDEN DE COMPRA",
        issueDateLabel: "Fecha",
        issueDateValue: formatDateSlash(order.documentDate),
        folioLabel: "Folio",
        folioValue:
          order.documentNumber != null && String(order.documentNumber).trim()
            ? String(order.documentNumber).trim()
            : "—",
      }}
    >
      <div className={styles.summaryGrid}>
        <SupplierPrintSummaryBlock model={order.supplierPrint} />
        <div className={styles.field}>
          <p className={styles.label}>Almacén destino</p>
          <p className={styles.value}>{order.storageLabel?.trim() ? order.storageLabel : "—"}</p>
        </div>
      </div>

      <table className={styles.table} data-test-id="purchase-order-print-lines">
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
          {order.lines.map((l, idx) => {
            const qty = Number(l.quantity) || 0;
            const price = Number(l.unitPrice) || 0;
            const lineTotal = Math.round(qty * price);
            const attrParts = attributeValuePartsForPrint(l.attributeValues);
            return (
              <tr key={`${order.id}-${l.variantId}-${idx}`}>
                <td className={styles.muted}>{idx + 1}</td>
                <td>
                  <span>{l.productName}</span>
                  {attrParts.length > 0 ? (
                    <span className={styles.muted}>{`. ${attrParts.join(".")}`}</span>
                  ) : null}
                </td>
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
        subtotalNeto={order.subtotalNeto}
        impuestosTotal={order.impuestosTotal}
        total={order.total}
        appliedTaxNames={order.appliedTaxNames}
        notes={order.notes}
      />
    </PrintableDocumentLayout>
  );
}
