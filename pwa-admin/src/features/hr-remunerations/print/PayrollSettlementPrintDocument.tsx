"use client";

import React, { useMemo } from "react";
import {
  PrintableDocumentLayout,
  type PrintableCompanyInfo,
} from "@/shared/components/PrintDocuments/PrintableDocumentLayout";
import { payrollLineCategory, labelPayrollLineType } from "../lib/payroll-line-types";
import type { RemunerationGridRow, RemunerationLine } from "../types/remuneration.types";
import styles from "./PayrollSettlementPrintDocument.module.css";

function formatDateSlash(value: string): string {
  const s = String(value || "").trim();
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s || "—";
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

function lineLabel(line: RemunerationLine): string {
  const custom = String(line.label ?? "").trim();
  if (custom) return custom;
  return labelPayrollLineType(line.typeId);
}

function periodLabelFromDate(value: string): string {
  const s = String(value || "").trim();
  const isoDate = s.match(/^(\d{4})-(\d{2})/);
  if (isoDate) {
    const [, y, m] = isoDate;
    const monthNames = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const idx = Math.max(0, Math.min(11, Number(m) - 1));
    return `${monthNames[idx]} ${y}`;
  }
  return formatDateSlash(s);
}

export function PayrollSettlementPrintDocument({
  company,
  settlement,
}: {
  company: PrintableCompanyInfo;
  settlement: RemunerationGridRow;
}) {
  const { earnings, deductions } = useMemo(() => {
    const lines = Array.isArray(settlement.lines) ? settlement.lines : [];
    const nextEarnings: RemunerationLine[] = [];
    const nextDeductions: RemunerationLine[] = [];
    for (const line of lines) {
      const amount = Math.round(Number(line.amount) || 0);
      if (amount <= 0) continue;
      const category =
        line.category === "DEDUCTION" || line.category === "EARNING"
          ? line.category
          : payrollLineCategory(String(line.typeId ?? ""));
      if (category === "DEDUCTION") {
        nextDeductions.push({ ...line, amount });
      } else {
        nextEarnings.push({ ...line, amount });
      }
    }
    return { earnings: nextEarnings, deductions: nextDeductions };
  }, [settlement.lines]);

  const employerCosts = Array.isArray(settlement.employerCosts)
    ? settlement.employerCosts.filter((c) => Math.round(Number(c.amount) || 0) > 0)
    : [];

  return (
    <PrintableDocumentLayout
      company={company}
      document={{
        title: "LIQUIDACIÓN DE SUELDO",
        issueDateLabel: "Fecha",
        issueDateValue: formatDateSlash(String(settlement.date ?? "")),
        folioLabel: "Folio",
        folioValue:
          settlement.documentNumber != null && String(settlement.documentNumber).trim()
            ? String(settlement.documentNumber).trim()
            : "—",
      }}
    >
      <div className={styles.summaryGrid} data-test-id="payroll-settlement-print-employee">
        <div className={styles.field}>
          <p className={styles.label}>Trabajador</p>
          <p className={styles.value}>{settlement.employeeName?.trim() || "—"}</p>
        </div>
        <div className={styles.field}>
          <p className={styles.label}>RUT</p>
          <p className={styles.value}>{settlement.employeeDocumentNumber?.trim() || "—"}</p>
        </div>
        <div className={styles.field}>
          <p className={styles.label}>Período</p>
          <p className={styles.value}>{periodLabelFromDate(String(settlement.date ?? ""))}</p>
        </div>
        <div className={styles.field}>
          <p className={styles.label}>Imponible</p>
          <p className={styles.value}>
            {formatMoneyClp(Number(settlement.totalImponible ?? 0))}
          </p>
        </div>
      </div>

      <div className={styles.columns}>
        <div>
          <p className={styles.sectionTitle}>Haberes</p>
          {earnings.length === 0 ? (
            <p className={styles.empty}>Sin haberes</p>
          ) : (
            <table className={styles.table} data-test-id="payroll-settlement-print-earnings">
              <thead className={styles.thead}>
                <tr>
                  <th>Concepto</th>
                  <th className={styles.num} style={{ width: "14ch" }}>
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {earnings.map((line, idx) => (
                  <tr key={`e-${line.typeId}-${idx}`}>
                    <td>{lineLabel(line)}</td>
                    <td className={styles.num}>{formatMoneyClp(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <p className={styles.sectionTitle}>Descuentos legales</p>
          {deductions.length === 0 ? (
            <p className={styles.empty}>Sin descuentos</p>
          ) : (
            <table className={styles.table} data-test-id="payroll-settlement-print-deductions">
              <thead className={styles.thead}>
                <tr>
                  <th>Concepto</th>
                  <th className={styles.num} style={{ width: "14ch" }}>
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {deductions.map((line, idx) => (
                  <tr key={`d-${line.typeId}-${idx}`}>
                    <td>{lineLabel(line)}</td>
                    <td className={styles.num}>{formatMoneyClp(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={styles.totals} data-test-id="payroll-settlement-print-totals">
        <div className={styles.totalsRow}>
          <span>Total haberes</span>
          <span className={styles.num}>{formatMoneyClp(settlement.totalEarnings)}</span>
        </div>
        <div className={styles.totalsRow}>
          <span>Total descuentos</span>
          <span className={styles.num}>{formatMoneyClp(settlement.totalDeductions)}</span>
        </div>
        <div className={`${styles.totalsRow} ${styles.totalsNet}`}>
          <span>Líquido a pagar</span>
          <span className={styles.num}>{formatMoneyClp(settlement.netPayment)}</span>
        </div>
      </div>

      {employerCosts.length > 0 ? (
        <div className={styles.employerBlock} data-test-id="payroll-settlement-print-employer">
          <p className={styles.sectionTitle}>Aportes del empleador (no descontados del líquido)</p>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>Concepto</th>
                <th className={styles.num} style={{ width: "14ch" }}>
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {employerCosts.map((c, idx) => (
                <tr key={`${c.code ?? c.label ?? "ec"}-${idx}`}>
                  <td>
                    {c.label?.trim() || c.code || "Aporte"}
                    {c.ratePercent != null ? (
                      <span className={styles.muted}>{` (${c.ratePercent}%)`}</span>
                    ) : null}
                  </td>
                  <td className={styles.num}>{formatMoneyClp(Number(c.amount) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className={styles.signatures}>
        <div className={styles.signatureBox}>
          <div className={styles.signatureLine} />
          <p className={styles.signatureLabel}>Firma empleador</p>
        </div>
        <div className={styles.signatureBox}>
          <div className={styles.signatureLine} />
          <p className={styles.signatureLabel}>Recibí conforme · trabajador</p>
        </div>
      </div>

      <p className={styles.footerNote}>
        Documento generado por Kai. Los montos corresponden a la liquidación registrada en el
        sistema.
      </p>
    </PrintableDocumentLayout>
  );
}
