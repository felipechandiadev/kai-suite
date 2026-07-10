import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";
import type { LoadedQuotationMeta } from "@/features/pos-cart/cart-storage";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { FiscalBoletaPrintPreview } from "@/features/fiscal/types/fiscal-emission.types";
import { buildCreateSaleClientPayload } from "@/features/session/lib/build-create-sale-payload";
import { getPosOfflineDb } from "../infrastructure/pos-offline-db";
import { promoteStandbyFiscalPackIfNeeded } from "../lib/fiscal-pack-transition";
import type { PosOfflineCommand, PosOfflineFiscalBlock } from "../domain/offline-command.types";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";
import { getOrCreateDeviceId, nextLocalDocumentNumber } from "./device-id";
import { buildOfflineBoletaPreview } from "./build-offline-boleta-preview.usecase";
import { buildOfflineSaleLines } from "./build-offline-sale-lines";
import { classifySaleLines } from "@/features/sale-print-plan/classify-sale-lines";
import { resolvePrintPlan } from "@/features/sale-print-plan/resolve-print-plan";
import {
  boletaReducedToTicketMessage,
  hydrateCartLinesFiscalFlags,
  resolveEffectiveSaleDocumentKind,
} from "@/features/sale-print-plan";
import { stockSnapshotRowId, catalogRowId } from "../lib/catalog-keys";
import { logOfflineTelemetry } from "../lib/offline-telemetry";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveOrderDiscount(appliedPromotions: AppliedSnapshot[]): number {
  return appliedPromotions
    .filter((promo) => promo.isOrderLevel)
    .reduce(
      (sum, promo) => sum + Math.max(0, Math.round(Number(promo.amountDiscounted) || 0)),
      0,
    );
}

export type CommitOfflineSaleInput = {
  pointOfSaleId: string;
  cashSessionId: string;
  priceListId: string;
  cartLines: PosCartLine[];
  payments: PosPaymentLine[];
  customer: PosSaleCustomer | null;
  appliedPromotions: AppliedSnapshot[];
  appliedTotal: number;
  overpay: number;
  saleDocumentKind: "TICKET" | "BOLETA" | "FACTURA";
  fiscalPack: OfflineFiscalPack | null;
  fiscalPackExpired: boolean;
  operatorName?: string | null;
  loadedQuotation?: LoadedQuotationMeta | null;
  loadedPresaleTickets?: { id: string; code: string }[];
  orderDiscount?: number;
};

export type CommitOfflineSaleResult = {
  command: PosOfflineCommand;
  localDocumentNumber: string;
  fiscalBlock: PosOfflineFiscalBlock | null;
  fiscalPrintPreview: FiscalBoletaPrintPreview | null;
  fiscalFolio: string | null;
  boletaSkippedMessage: string | null;
  printPlan: ReturnType<typeof resolvePrintPlan>;
};

export async function commitOfflineSale(
  input: CommitOfflineSaleInput,
): Promise<CommitOfflineSaleResult> {
  const cartLines = await hydrateCartLinesFiscalFlags(
    input.cartLines,
    input.pointOfSaleId,
    input.priceListId,
  );
  const effectiveSaleDocumentKind = resolveEffectiveSaleDocumentKind(
    input.saleDocumentKind,
    cartLines,
  );
  const salePayloadBase = buildCreateSaleClientPayload({
    pointOfSaleId: input.pointOfSaleId,
    cashSessionId: input.cashSessionId,
    cartLines,
    payments: input.payments,
    customer: input.customer,
    appliedPromotions: input.appliedPromotions,
    appliedTotal: input.appliedTotal,
    overpay: input.overpay,
    fulfillPresaleTicketIds: input.loadedPresaleTickets?.map((t) => t.id),
    loadedPresaleTickets: input.loadedPresaleTickets,
    loadedQuotation: input.loadedQuotation,
    saleDocumentKind: effectiveSaleDocumentKind,
    selectedSaleDocumentKind: input.saleDocumentKind,
  });

  const salePayload = {
    ...salePayloadBase,
    pointOfSaleId: input.pointOfSaleId,
    cashSessionId: input.cashSessionId,
    lines: buildOfflineSaleLines(cartLines),
  };

  const db = getPosOfflineDb();
  const deviceId = await getOrCreateDeviceId();
  const localDocumentNumber = await nextLocalDocumentNumber();
  const now = new Date().toISOString();
  const clientOperationId = randomUuid();

  let fiscalBlock: PosOfflineFiscalBlock | null = null;
  let fiscalPrintPreview: FiscalBoletaPrintPreview | null = null;
  let fiscalFolio: string | null = null;
  let boletaSkippedMessage: string | null =
    boletaReducedToTicketMessage(input.saleDocumentKind, cartLines);
  const buckets = classifySaleLines(cartLines);
  const printPlan = resolvePrintPlan(input.saleDocumentKind, buckets);

  const command = await db.transaction(
    "rw",
    [db.commands, db.fiscal_pack, db.fiscal_pack_standby, db.stock_snapshot, db.catalog, db.meta],
    async () => {
      if (input.saleDocumentKind === "BOLETA") {
        if (buckets.dteLines.length === 0) {
          if (!boletaSkippedMessage) {
            boletaSkippedMessage =
              "Sin ítems tributarios en el carrito. Se imprimirá solo ticket interno.";
          }
        } else {
        let pack = input.fiscalPack;
        if (!pack) {
          boletaSkippedMessage =
            "Sin paquete fiscal local. Se imprimirá solo ticket interno.";
        } else if (input.fiscalPackExpired) {
          boletaSkippedMessage =
            "Paquete fiscal vencido. Renueva folios con conexión. Solo ticket interno.";
        } else {
          pack = (await promoteStandbyFiscalPackIfNeeded(db, input.pointOfSaleId)) ?? pack;
          if (pack.nextFolioLocal > pack.rangeTo) {
            boletaSkippedMessage =
              "Sin folios CAF disponibles offline. Reconecte para actualizar el pack fiscal.";
          } else {
          const folio = pack.nextFolioLocal;
          pack.nextFolioLocal = folio + 1;
          await db.fiscal_pack.put(pack);

          const built = buildOfflineBoletaPreview({
            cartLines,
            customer: input.customer,
            fiscalPack: pack,
            folio,
            localDocumentNumber,
            operatorName: input.operatorName,
            orderDiscount:
              input.orderDiscount ?? resolveOrderDiscount(input.appliedPromotions),
          });
          fiscalBlock = {
            folio,
            allocationId: pack.allocationId,
            cafId: pack.cafId,
            tedXml: built.tedXml,
            issuedAt: built.issuedAt,
          };
          fiscalPrintPreview = built.preview;
          fiscalFolio = String(folio);
          boletaSkippedMessage = null;
          }
        }
        }
        }
      }

      for (const line of cartLines) {
        if (!line.trackInventory) continue;
        const qty = Math.max(0, Number(line.quantity) || 0);
        if (qty <= 0) continue;

        const stockId = stockSnapshotRowId(
          input.pointOfSaleId,
          input.priceListId,
          line.variantId,
        );
        const stockRow = await db.stock_snapshot.get(stockId);
        if (stockRow) {
          const nextStock =
            stockRow.availableStock != null
              ? Math.max(0, stockRow.availableStock - qty)
              : stockRow.availableStock;
          const ratio =
            stockRow.availableStockBase != null &&
            stockRow.availableStock != null &&
            stockRow.availableStock > 0
              ? stockRow.availableStockBase / stockRow.availableStock
              : null;
          const nextStockBase =
            stockRow.availableStockBase != null && ratio != null
              ? Math.max(0, stockRow.availableStockBase - qty * ratio)
              : stockRow.availableStockBase;
          await db.stock_snapshot.update(stockId, {
            availableStock: nextStock,
            availableStockBase: nextStockBase,
          });
        }

        const catId = catalogRowId(input.pointOfSaleId, input.priceListId, line.variantId);
        const catalogRow = await db.catalog.get(catId);
        if (catalogRow) {
          const nextStock =
            catalogRow.availableStock != null
              ? Math.max(0, catalogRow.availableStock - qty)
              : catalogRow.availableStock;
          const ratio =
            catalogRow.availableStockBase != null &&
            catalogRow.availableStock != null &&
            catalogRow.availableStock > 0
              ? catalogRow.availableStockBase / catalogRow.availableStock
              : null;
          const nextStockBase =
            catalogRow.availableStockBase != null && ratio != null
              ? Math.max(0, catalogRow.availableStockBase - qty * ratio)
              : catalogRow.availableStockBase;
          await db.catalog.update(catId, {
            availableStock: nextStock,
            availableStockBase: nextStockBase,
          });
        }
      }

      const cmd: PosOfflineCommand = {
        id: clientOperationId,
        clientOperationId,
        deviceId,
        commandType: "SALE",
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
        retryCount: 0,
        localDocumentNumber,
        serverDocumentNumber: null,
        serverTransactionId: null,
        payload: salePayload,
        fiscal: fiscalBlock,
        dependsOn: null,
        lastError: null,
      };
      await db.commands.put(cmd);
      return cmd;
    },
  );

  logOfflineTelemetry("offline_sale_committed", {
    pointOfSaleId: input.pointOfSaleId,
    localDocumentNumber,
    lineCount: cartLines.length,
    hasFiscal: !!fiscalBlock,
  });

  return {
    command,
    localDocumentNumber,
    fiscalBlock,
    fiscalPrintPreview,
    fiscalFolio,
    boletaSkippedMessage,
    printPlan,
  };
}
