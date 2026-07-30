"use client";

import React from "react";
import styles from "./PrintableDocumentLayout.module.css";

export type PrintableCompanyInfo = {
  /** Nombre de fantasía (cabecera grande si existe; la razón social va arriba en texto pequeño). */
  displayName?: string | null;
  razonSocial: string;
  rut?: string | null;
  addressLines?: string[];
  phone?: string | null;
  email?: string | null;
};

export type PrintableDocumentMeta = {
  title: string;
  issueDateLabel: string;
  issueDateValue: string;
  folioLabel?: string;
  folioValue?: string | null;
};

export function PrintableDocumentLayout({
  company,
  document,
  children,
}: {
  company: PrintableCompanyInfo;
  document: PrintableDocumentMeta;
  children: React.ReactNode;
}) {
  const razonSocialTrim = (company.razonSocial ?? "").trim();
  const displayNameTrim = (company.displayName ?? "").trim();
  const addressLines = Array.isArray(company.addressLines) ? company.addressLines.filter((s) => s.trim()) : [];
  const rutTrim = (company.rut ?? "").trim();
  const phoneTrim = (company.phone ?? "").trim();
  const emailTrim = (company.email ?? "").trim();

  const inlineParts = [
    rutTrim ? `RUT: ${rutTrim}` : "",
    phoneTrim ? `Tel: ${phoneTrim}` : "",
    emailTrim ? emailTrim : "",
  ].filter(Boolean);

  const folioLabel = (document.folioLabel ?? "Folio").trim();
  const folioValueTrim = (document.folioValue ?? "").trim();

  return (
    <div className={styles.page} data-test-id="printable-document-layout">
      <header className={styles.companyHeader}>
        <div>
          {displayNameTrim ? (
            <>
              <p className={styles.companyKicker}>{razonSocialTrim || "—"}</p>
              <h1 className={styles.companyName}>{displayNameTrim}</h1>
            </>
          ) : (
            <h1 className={styles.companyName}>{razonSocialTrim || "—"}</h1>
          )}
          {addressLines.map((line, i) => (
            <p key={`${line}-${i}`} className={styles.companyAddress}>
              {line}
            </p>
          ))}
          {inlineParts.length > 0 ? (
            <p className={styles.companyInline}>{inlineParts.join(" · ")}</p>
          ) : null}
        </div>

        <div className={styles.documentMeta}>
          <h2 className={styles.documentTitle}>{document.title}</h2>
          <p className={styles.documentDate}>
            {document.issueDateLabel}: {document.issueDateValue}
          </p>
          {folioValueTrim ? (
            <p className={styles.documentFolio}>
              {folioLabel} {folioValueTrim}
            </p>
          ) : null}
        </div>
      </header>

      <div className={styles.separator} aria-hidden />

      <section className={styles.content}>{children}</section>
    </div>
  );
}

