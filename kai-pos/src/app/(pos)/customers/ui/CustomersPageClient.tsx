"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PosCustomerSearchRow, PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { PosCustomerDetailBundle } from "@/features/customers/types/pos-customer-detail.types";
import { isPosCustomerUuid } from "@/features/customers/lib/pos-customer-url";
import PosCustomerSearchPanel, {
  POS_CUSTOMER_URL_KEYS,
  type PosCustomerSearchInitial,
} from "@/features/customers/ui/PosCustomerSearchPanel";
import { PosCreateCustomerDialog } from "@/features/customers/ui/PosCreateCustomerDialog";
import PosCustomerDetailPanel from "@/features/customers/ui/PosCustomerDetailPanel";

const SEARCH_PANEL_VH = 76;

type Props = {
  initialCustomerSearch: PosCustomerSearchInitial;
  customerIdParam: string;
  detailBundle: PosCustomerDetailBundle | null;
  internalCreditEnabled: boolean;
};

export default function CustomersPageClient({
  initialCustomerSearch,
  customerIdParam,
  detailBundle,
  internalCreditEnabled,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  /** La URL es la fuente de verdad inmediata al elegir cliente (no esperar al refresh del RSC). */
  const customerIdFromUrl = (sp.get(POS_CUSTOMER_URL_KEYS.selectedId) ?? customerIdParam).trim();
  const customerIdValidFromUrl = !customerIdFromUrl || isPosCustomerUuid(customerIdFromUrl);
  const selectedCustomerId =
    customerIdFromUrl && customerIdValidFromUrl ? customerIdFromUrl : null;
  const invalidId = Boolean(customerIdFromUrl && !customerIdValidFromUrl);

  const detailBundleForSelection = useMemo(() => {
    if (!selectedCustomerId || !detailBundle?.success) return null;
    if (detailBundle.customer.customerId !== selectedCustomerId) return null;
    return detailBundle;
  }, [detailBundle, selectedCustomerId]);

  const selectedForSearch: PosSaleCustomer | null = useMemo(() => {
    if (detailBundleForSelection) {
      const c = detailBundleForSelection.customer;
      return {
        customerId: c.customerId,
        name: c.displayName || "Cliente",
        document: c.documentNumber?.trim() ?? "",
        phone: c.phone?.trim() ?? "",
        email: c.email?.trim() || null,
      };
    }
    if (!selectedCustomerId) return null;
    const row = initialCustomerSearch.items.find((i) => i.customerId === selectedCustomerId);
    if (!row) return null;
    return {
      customerId: row.customerId,
      name: row.displayName?.trim() || "Cliente",
      document: row.documentNumber?.trim() ?? "",
      phone: row.phone?.trim() ?? "",
      email: row.email?.trim() || null,
    };
  }, [detailBundleForSelection, initialCustomerSearch.items, selectedCustomerId]);

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mutate(p);
      startTransition(() => {
        const qs = p.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, sp],
  );

  const onPick = useCallback(
    (row: PosCustomerSearchRow) => {
      if (!row.customerId) return;
      pushParams((p) => {
        p.set(POS_CUSTOMER_URL_KEYS.selectedId, row.customerId);
        p.set(POS_CUSTOMER_URL_KEYS.page, "1");
      });
    },
    [pushParams],
  );

  const onClearSelected = useCallback(() => {
    pushParams((p) => {
      p.delete(POS_CUSTOMER_URL_KEYS.selectedId);
    });
  }, [pushParams]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Clientes</h1>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(260px,360px)_minmax(0,1fr)] md:items-stretch">
        <PosCustomerSearchPanel
          initial={initialCustomerSearch}
          selectedCustomer={selectedForSearch}
          onPick={onPick}
          onClearSelected={onClearSelected}
          heightVh={SEARCH_PANEL_VH}
          variant="split"
          showAddCustomer
          onAddCustomerClick={() => setCreateCustomerOpen(true)}
        />
        <div className="min-h-0 min-w-0 overflow-y-auto md:max-h-[76vh]">
          <PosCustomerDetailPanel
            customerId={selectedCustomerId}
            initialBundle={detailBundleForSelection}
            invalidId={invalidId}
            internalCreditEnabled={internalCreditEnabled}
          />
        </div>
      </div>

      <PosCreateCustomerDialog
        open={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        internalCreditEnabled={internalCreditEnabled}
        onSuccess={(info) => {
          pushParams((p) => {
            p.set(POS_CUSTOMER_URL_KEYS.selectedId, info.customerId);
            p.set(POS_CUSTOMER_URL_KEYS.page, "1");
          });
        }}
      />
    </div>
  );
}
