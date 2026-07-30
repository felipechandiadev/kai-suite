import type {
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import type { SaleCollectionStatus } from "@/features/sales-transactions/lib/sale-collection-status";
import type { CustomerCreditNoteUsageStatus } from "@/features/sales-customers/types/customer-related-documents.types";

export type LinkedCreditNoteListSummary = {
  id: string;
  documentNumber: string;
  total: number;
  consumedAmount: number;
  availableAmount: number;
  usageStatus: CustomerCreditNoteUsageStatus;
};

export type RelatedSalePaymentFolio = {
  id: string;
  documentNumber: string;
};

export interface SalesTransactionListRow {
  id: string;
  documentNumber: string;
  /** Tipo de documento tributario (`transactions.documentType`). */
  documentType: string | null;
  /** Folio del documento tributario (`transactions.documentFolio`). */
  documentFolio: string | null;
  transactionType: string;
  status: SalesPaymentStatus;
  /** `paymentStatus` de la venta o derivado de montos. */
  collectionStatus: SaleCollectionStatus;
  /** Cobros PAYMENT_IN asociados (`relatedTransactionId` → venta). */
  relatedPaymentFolios: RelatedSalePaymentFolio[];
  total: number;
  amountPaid: number;
  backorderDepositAmount: number | null;
  backorderPercent: number | null;
  /** `metadata.backorder.reservationStatus` (solo encargos). */
  backorderReservationStatus: string | null;
  /** `pos` | `e-shop` desde metadata.source */
  orderOrigin: string | null;
  paymentMethod: SalesPaymentMethod;
  /** Cantidad de líneas en metadata.payments (0 = desconocido / legacy). */
  paymentLinesCount: number;
  /** NC vinculada a la devolución (`SALE_RETURN`), con saldo de uso. */
  linkedCreditNote: LinkedCreditNoteListSummary | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  counterpartyLabel: string | null;
  userFullName: string | null;
  createdAt: string;
}

export interface SalesTransactionsListResult {
  rows: SalesTransactionListRow[];
  total: number;
  page: number;
  limit: number;
}
