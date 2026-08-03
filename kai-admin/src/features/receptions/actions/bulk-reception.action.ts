"use server";

import { lookupPersonByDocumentRequest } from "@/features/chile-person/infrastructure/person-document.request";
import { isValidChileRut, parseChileRut } from "@/features/chile-person/lib/chile-rut.util";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { ReceptionRequest } from "../infrastructure/reception.request";
import { resolveVariantBySkuOrBarcode } from "../infrastructure/bulk-reception-resolve.request";
import type { BulkReceptionExcelRow } from "../lib/bulk-reception-excel";
import {
  buildSupplierFiscalAmounts,
  bulkGroupKey,
  type BulkReceptionPrepareResult,
  type BulkReceptionPreparedGroup,
  type BulkReceptionResolvedLine,
  type BulkReceptionRowError,
} from "../lib/bulk-reception-group";
import type { CreateDirectReceptionInput } from "../types/reception.types";

function pickIvaTax(taxes: TaxListItem[]): { taxId: string | null; taxRatePct: number } {
  const active = taxes.filter((t) => t.isActive !== false && t.taxType === "IVA");
  if (!active.length) {
    const anyIva = taxes.filter((t) => t.taxType === "IVA");
    const pick = anyIva.find((t) => t.isDefault) ?? anyIva[0];
    if (!pick) return { taxId: null, taxRatePct: 19 };
    return { taxId: pick.id, taxRatePct: Number(pick.rate) || 19 };
  }
  const def = active.find((t) => t.isDefault);
  if (def) return { taxId: def.id, taxRatePct: Number(def.rate) || 19 };
  const rate19 = active.find((t) => Math.round(Number(t.rate) || 0) === 19);
  if (rate19) return { taxId: rate19.id, taxRatePct: Number(rate19.rate) || 19 };
  return { taxId: active[0]!.id, taxRatePct: Number(active[0]!.rate) || 19 };
}

function normalizeDocRef(raw: string): string {
  return raw.trim();
}

async function resolveSupplierByRut(rutRaw: string): Promise<
  | { success: true; supplierId: string; supplierName: string; rutFormatted: string }
  | { success: false; error: string }
> {
  if (!isValidChileRut(rutRaw)) {
    return { success: false, error: `RUT inválido: "${rutRaw}".` };
  }
  const parsed = parseChileRut(rutRaw)!;
  // Probar formateado y cuerpo-DV sin puntos
  const candidates = [parsed.formatted, `${parsed.body}-${parsed.dv}`, rutRaw.trim()];
  let lastError = "Proveedor no encontrado para ese RUT.";
  for (const documentNumber of candidates) {
    const res = await lookupPersonByDocumentRequest({ documentNumber, documentType: "RUT" });
    if (!res.success) {
      lastError = res.error;
      continue;
    }
    if (!res.data.found || !res.data.person) {
      continue;
    }
    const supplierId = res.data.roles?.supplier?.id?.trim() ?? "";
    if (!supplierId) {
      return {
        success: false,
        error: `La persona ${parsed.formatted} existe pero no es proveedor.`,
      };
    }
    if (res.data.roles?.supplier?.isActive === false) {
      return { success: false, error: `El proveedor ${parsed.formatted} está inactivo.` };
    }
    const p = res.data.person;
    const name =
      (p.businessName && p.businessName.trim()) ||
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
      parsed.formatted;
    return {
      success: true,
      supplierId,
      supplierName: name,
      rutFormatted: parsed.formatted,
    };
  }
  return { success: false, error: lastError };
}

export async function prepareBulkReceptionImportAction(input: {
  rows: BulkReceptionExcelRow[];
  branchId: string;
  storageId: string;
}): Promise<BulkReceptionPrepareResult> {
  const branchId = input.branchId?.trim() ?? "";
  const storageId = input.storageId?.trim() ?? "";
  if (!branchId) {
    return { success: false, error: "Seleccione una sucursal." };
  }
  if (!storageId) {
    return { success: false, error: "Seleccione un almacén destino." };
  }
  if (!input.rows?.length) {
    return { success: false, error: "No hay filas para validar." };
  }

  const taxes = await listTaxesForPage();
  const { taxId, taxRatePct } = pickIvaTax(taxes);

  const rowErrors: BulkReceptionRowError[] = [];
  const supplierCache = new Map<
    string,
    | { success: true; supplierId: string; supplierName: string; rutFormatted: string }
    | { success: false; error: string }
  >();
  const variantCache = new Map<
    string,
    Awaited<ReturnType<typeof resolveVariantBySkuOrBarcode>>
  >();

  type AccLine = BulkReceptionResolvedLine & {
    supplierId: string;
    supplierName: string;
    supplierRut: string;
    numeroFactura: string;
  };
  const accepted: AccLine[] = [];

  for (const row of input.rows) {
    const factura = normalizeDocRef(row.numeroFactura);
    if (!factura) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Falta número de factura." });
      continue;
    }
    if (!row.rutProveedor?.trim()) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Falta RUT del proveedor." });
      continue;
    }
    if (!row.sku?.trim() && !row.codigoBarras?.trim()) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: "Indique SKU o código de barras (al menos uno).",
      });
      continue;
    }
    if (row.cantidad == null || !(row.cantidad > 0)) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Cantidad debe ser mayor a cero." });
      continue;
    }
    if (row.precioNeto == null || !(row.precioNeto > 0)) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: "Precio neto de compra debe ser mayor a cero.",
      });
      continue;
    }

    const rutKey = row.rutProveedor.trim().toUpperCase();
    let supplier = supplierCache.get(rutKey);
    if (!supplier) {
      supplier = await resolveSupplierByRut(row.rutProveedor);
      supplierCache.set(rutKey, supplier);
    }
    if (!supplier.success) {
      rowErrors.push({ rowNumber: row.rowNumber, message: supplier.error });
      continue;
    }

    const variantKey = `${row.sku.trim().toLowerCase()}|${row.codigoBarras.trim().toLowerCase()}`;
    let variantRes = variantCache.get(variantKey);
    if (!variantRes) {
      variantRes = await resolveVariantBySkuOrBarcode({
        sku: row.sku,
        barcode: row.codigoBarras,
      });
      variantCache.set(variantKey, variantRes);
    }
    if (!variantRes.success) {
      rowErrors.push({ rowNumber: row.rowNumber, message: variantRes.error });
      continue;
    }

    const qty = Math.round(Number(row.cantidad) * 1000) / 1000;
    const unit = Math.round(Number(row.precioNeto));
    accepted.push({
      rowNumber: row.rowNumber,
      productId: variantRes.variant.productId,
      productVariantId: variantRes.variant.productVariantId,
      productName: variantRes.variant.productName,
      sku: variantRes.variant.sku,
      quantity: qty,
      unitPrice: unit,
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      supplierRut: supplier.rutFormatted,
      numeroFactura: factura,
    });
  }

  const byGroup = new Map<string, AccLine[]>();
  for (const line of accepted) {
    const key = bulkGroupKey(line.supplierId, line.numeroFactura);
    const list = byGroup.get(key) ?? [];
    list.push(line);
    byGroup.set(key, list);
  }

  const groups: BulkReceptionPreparedGroup[] = [];
  for (const [, lines] of byGroup) {
    const first = lines[0]!;
    // Misma factura no debe mezclar proveedores (por construcción del key no pasa).
    const subtotalNeto = lines.reduce((s, l) => s + Math.round(l.unitPrice * l.quantity), 0);
    const fiscal = buildSupplierFiscalAmounts({ subtotalNeto, taxId, taxRatePct });

    let duplicate = false;
    let duplicateMessage: string | undefined;
    try {
      await ReceptionRequest.resolveBySupplierDocumentRef(
        first.supplierId,
        first.numeroFactura,
      );
      duplicate = true;
      duplicateMessage = `Ya existe una recepción para factura "${first.numeroFactura}" del proveedor ${first.supplierRut}.`;
    } catch {
      duplicate = false;
    }

    const createInput: CreateDirectReceptionInput = {
      branchId,
      storageId,
      supplierId: first.supplierId,
      reference: first.numeroFactura,
      documentType: "invoice",
      notes: "Carga masiva Excel",
      lines: lines.map((l) => ({
        productId: l.productId,
        productVariantId: l.productVariantId,
        productName: l.productName,
        sku: l.sku,
        quantity: l.quantity,
        receivedQuantity: l.quantity,
        unitPrice: l.unitPrice,
        unitCost: l.unitPrice,
      })),
      supplierDocumentPayment: {
        mode: "PENDING",
        paidLines: [],
        scheduledLines: [],
      },
      supplierFiscalAmounts: fiscal,
    };

    groups.push({
      key: bulkGroupKey(first.supplierId, first.numeroFactura),
      supplierId: first.supplierId,
      supplierName: first.supplierName,
      supplierRut: first.supplierRut,
      numeroFactura: first.numeroFactura,
      lines: lines.map(({ rowNumber, productId, productVariantId, productName, sku, quantity, unitPrice }) => ({
        rowNumber,
        productId,
        productVariantId,
        productName,
        sku,
        quantity,
        unitPrice,
      })),
      createInput,
      duplicate,
      duplicateMessage,
    });
  }

  const processable = groups.filter((g) => !g.duplicate);
  const blocked = rowErrors.length > 0 || processable.length === 0;

  return {
    success: true,
    groups,
    rowErrors,
    blocked,
  };
}
