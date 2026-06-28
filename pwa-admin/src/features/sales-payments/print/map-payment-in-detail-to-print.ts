import { resolveCompanyPhone } from "@kai/document-print";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import { formatSalePaymentMethodDisplay } from "@/features/sales-transactions/lib/format-sale-payment-method";
import type { SaleTransactionDetail } from "@/features/sales-transactions/types/sale-transaction-detail.types";
import type { PaymentInPrintData } from "./payment-in-print.types";

export function mapPaymentInDetailToPrintData(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): PaymentInPrintData {
  const payments =
    detail.payments.length > 0
      ? detail.payments.map((p) => {
          const key = p.method as SalesPaymentMethod;
          const label =
            p.alias?.trim() ||
            SALES_PAYMENT_METHOD_LABEL[key] ||
            p.method;
          return {
            label,
            amount: p.amount,
            detail: p.reference?.trim() || null,
          };
        })
      : [
          {
            label: formatSalePaymentMethodDisplay(detail.paymentMethod, 0),
            amount: detail.amountPaid,
            detail: null,
          },
        ];

  const allocations = detail.arCollectionAllocations.map((a) => ({
    documentNumber: a.documentNumber?.trim() || a.saleId,
    amount: a.amount,
  }));

  const operatorName =
    detail.userFullName?.trim() ||
    detail.userUserName?.trim() ||
    null;

  return {
    folio: detail.documentNumber.trim() || "—",
    issuedAtIso: detail.createdAt,
    company: {
      razonSocial: company?.razonSocial?.trim() ?? "",
      nombreFantasia: company?.nombreFantasia?.trim() ?? null,
      rut: company?.rut?.trim() ?? null,
      businessActivity: company?.businessActivity?.trim() ?? null,
      logoUrl: null,
      address: company?.address?.trim() ?? null,
      mail: company?.mail?.trim() ?? null,
      phone: resolveCompanyPhone(company),
    },
    branchName: detail.branchName?.trim() || null,
    pointOfSaleName: detail.pointOfSaleName?.trim() || null,
    operatorName,
    customer: detail.customerLabel?.trim()
      ? {
          name: detail.customerLabel.trim(),
          document: detail.customerDocument?.trim() ?? null,
        }
      : null,
    totalCollected: detail.total,
    amountPaid: detail.amountPaid,
    payments,
    allocations,
    notes: detail.notes?.trim() || null,
    externalReference: detail.externalReference?.trim() || null,
  };
}
