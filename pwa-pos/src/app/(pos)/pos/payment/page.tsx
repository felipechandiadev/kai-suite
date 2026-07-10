import { Suspense } from "react";
import PosPaymentWorkspace from "./ui/PosPaymentWorkspace";
import { POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE } from "@/features/customers/lib/posCustomerSearchStorage";
import type { PosCustomerSearchInitial } from "@/features/customers/ui/PosCustomerSearchPanel";
import { DotProgress } from "@kai/ui";

const emptyCustomerSearch: PosCustomerSearchInitial = {
  query: "",
  page: 1,
  pageSize: POS_CUSTOMER_SEARCH_DEFAULT_PAGE_SIZE,
  items: [],
  total: 0,
  error: null,
};

/**
 * Shell estático: evita fetch SSR al navegar a cobro (necesario para modo offline).
 * La búsqueda de clientes se resuelve en cliente cuando hay conexión.
 */
export default function Page() {
  return (
    <div className="h-full min-h-0">
      <Suspense fallback={<div className="flex justify-center py-12"><DotProgress /></div>}>
        <PosPaymentWorkspace initialCustomerSearch={emptyCustomerSearch} />
      </Suspense>
    </div>
  );
}
