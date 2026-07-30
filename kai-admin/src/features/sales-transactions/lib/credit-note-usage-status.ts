import type { BadgeVariant } from "@kai/ui";
import type { CustomerCreditNoteUsageStatus } from "@/features/sales-customers/types/customer-related-documents.types";

export const CREDIT_NOTE_USAGE_LABEL: Record<
  CustomerCreditNoteUsageStatus,
  string
> = {
  available: "Disponible",
  partially_used: "Utilizada parcialmente",
  fully_used: "Utilizada",
};

export function creditNoteUsageVariant(
  status: CustomerCreditNoteUsageStatus,
): BadgeVariant {
  if (status === "available") return "success-outlined";
  if (status === "partially_used") return "warning-outlined";
  return "secondary-outlined";
}
