"use client";

import React from "react";
import type { SupplierIdentityPrintFields } from "./supplierPrintIdentity";
import styles from "./PurchaseOrderPrintDocument.module.css";

const DASH = "—";

export type SupplierPrintSummaryModel = {
  /** Nombre comercial / alias (selector). */
  commercialName?: string | null;
  identity: SupplierIdentityPrintFields;
  /** Referencia al documento del proveedor (folio factura, guía, etc.). */
  documentReference?: string | null;
};

function displayNameLine(m: SupplierPrintSummaryModel): string {
  const legal = m.identity.legalName?.trim();
  if (legal) {
    return legal;
  }
  const com = m.commercialName?.trim();
  if (com) {
    return com;
  }
  return DASH;
}

export function SupplierPrintSummaryBlock({ model }: { model: SupplierPrintSummaryModel }) {
  const nameLine = displayNameLine(model);
  const tax = model.identity.taxIdLine?.trim();
  const addr = model.identity.address?.trim();
  const ref = model.documentReference?.trim();

  return (
    <div className={styles.supplierIdentity} data-test-id="supplier-print-summary">
      <p className={styles.label}>Proveedor</p>
      <div className={styles.supplierPrintBody}>
        <p className={styles.value}>{nameLine}</p>
        {tax ? <p className={styles.value}>{tax}</p> : null}
        {addr ? <p className={styles.value}>{addr}</p> : null}
        {ref ? <p className={styles.value}>{`Referencia: ${ref}`}</p> : null}
      </div>
    </div>
  );
}
