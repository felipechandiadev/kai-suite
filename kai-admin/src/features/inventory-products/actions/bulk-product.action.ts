"use server";

import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import { pickDefaultUnit } from "@/features/inventory-units/types/unit.types";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import {
  effectiveGrossFactor,
  netToGross,
  roundMoneyInt,
} from "@/features/inventory-products/domain/price-tax-math";
import { catalogDefaultIvaTaxIds } from "@/features/inventory-products/lib/sale-taxes";
import { variantExistsBySkuOrBarcode } from "../infrastructure/bulk-product-resolve.request";
import {
  parseNonNegativeNumber,
  parseOptionalBoolean,
  type BulkProductExcelRow,
} from "../lib/bulk-product-excel";
import type {
  BulkProductPrepareResult,
  BulkProductPreparedRow,
  BulkProductRowError,
} from "../lib/bulk-product-prepare.types";

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

export async function prepareBulkProductImportAction(input: {
  rows: BulkProductExcelRow[];
  /** Si false, fuerza visibleInEShop=false */
  allowEshop: boolean;
  /** Si false, fuerza onMenu=false */
  allowMenu: boolean;
}): Promise<BulkProductPrepareResult> {
  if (!input.rows?.length) {
    return { success: false, error: "No hay filas para validar." };
  }

  const [categories, units, priceLists, taxes] = await Promise.all([
    listCategoriesForPage(),
    listUnitsForPage(),
    listPriceListsForPage(),
    listTaxesForPage(),
  ]);

  const defaultUnit = pickDefaultUnit(units);
  if (!defaultUnit) {
    return {
      success: false,
      error:
        "No hay unidad de medida activa. Cree una en Inventario → Unidades antes de importar.",
    };
  }

  const activePriceLists = priceLists.filter((p) => p.isActive);
  const defaultPriceListId =
    activePriceLists.find((p) => p.isDefault)?.id ?? activePriceLists[0]?.id ?? null;
  if (!defaultPriceListId) {
    return { success: false, error: "No hay lista de precios activa." };
  }

  const defaultIva = catalogDefaultIvaTaxIds(taxes);
  const grossFactor = effectiveGrossFactor(taxes, defaultIva);

  const categoryByName = new Map<string, { id: string; name: string }>();
  for (const c of categories) {
    const key = normalizeKey(c.name);
    if (!categoryByName.has(key)) {
      categoryByName.set(key, { id: c.id, name: c.name });
    }
  }

  const rowErrors: BulkProductRowError[] = [];
  const skuInFile = new Map<string, number>();
  const barcodeInFile = new Map<string, number>();

  for (const row of input.rows) {
    const skuKey = normalizeKey(row.sku);
    if (skuKey) {
      if (skuInFile.has(skuKey)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `SKU duplicado en el archivo (también fila ${skuInFile.get(skuKey)}).`,
        });
      } else {
        skuInFile.set(skuKey, row.rowNumber);
      }
    }
    const bcKey = normalizeKey(row.codigoBarras);
    if (bcKey) {
      if (barcodeInFile.has(bcKey)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Código de barras duplicado en el archivo (también fila ${barcodeInFile.get(bcKey)}).`,
        });
      } else {
        barcodeInFile.set(bcKey, row.rowNumber);
      }
    }
  }

  const prepared: BulkProductPreparedRow[] = [];
  const existsCache = new Map<
    string,
    Awaited<ReturnType<typeof variantExistsBySkuOrBarcode>>
  >();

  for (const row of input.rows) {
    const nombre = row.nombre.trim();
    const sku = row.sku.trim();
    if (!nombre) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Nombre obligatorio." });
      continue;
    }
    if (!sku) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "SKU obligatorio." });
      continue;
    }

    if (row.activoRaw.trim() && parseOptionalBoolean(row.activoRaw) === undefined) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Valor de activo inválido: "${row.activoRaw}". Use si/no.`,
      });
      continue;
    }
    if (row.eshopRaw.trim() && parseOptionalBoolean(row.eshopRaw) === undefined) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Valor de eshop inválido: "${row.eshopRaw}". Use si/no.`,
      });
      continue;
    }
    if (row.menuRaw.trim() && parseOptionalBoolean(row.menuRaw) === undefined) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Valor de menu inválido: "${row.menuRaw}". Use si/no.`,
      });
      continue;
    }

    if (row.precioRaw.trim() && row.precio == null) {
      const retry = parseNonNegativeNumber(row.precioRaw);
      if (retry == null || retry < 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Precio inválido: "${row.precioRaw}".`,
        });
        continue;
      }
    }
    if (row.precio != null && row.precio < 0) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: "El precio no puede ser negativo.",
      });
      continue;
    }

    let categoryId: string | null = null;
    let categoryName: string | null = null;
    const catRaw = row.categoria.trim();
    if (catRaw) {
      const cat = categoryByName.get(normalizeKey(catRaw));
      if (!cat) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: `Categoría no encontrada: "${catRaw}".`,
        });
        continue;
      }
      categoryId = cat.id;
      categoryName = cat.name;
    }

    const barcode = row.codigoBarras.trim() || null;
    const cacheKey = `sku:${normalizeKey(sku)}|bc:${normalizeKey(barcode ?? "")}`;
    let existsRes = existsCache.get(cacheKey);
    if (!existsRes) {
      existsRes = await variantExistsBySkuOrBarcode({
        sku,
        barcode: barcode ?? undefined,
      });
      existsCache.set(cacheKey, existsRes);
    }
    if ("error" in existsRes) {
      rowErrors.push({ rowNumber: row.rowNumber, message: existsRes.error });
      continue;
    }
    if (existsRes.exists) {
      const label = existsRes.by === "sku" ? "SKU" : "código de barras";
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: `Ya existe una variante con ${label} "${existsRes.value}".`,
      });
      continue;
    }

    const isActive = row.activo ?? true;
    const visibleInEShop = input.allowEshop ? (row.eshop ?? false) : false;
    const onMenu = input.allowMenu ? (row.menu ?? false) : false;
    const basePrice = roundMoneyInt(row.precio ?? 0);
    const netPrice = basePrice;
    const grossPrice = netToGross(netPrice, grossFactor);

    prepared.push({
      rowNumber: row.rowNumber,
      nombre,
      sku,
      barcode,
      categoryId,
      categoryName,
      isActive,
      visibleInEShop,
      onMenu,
      basePrice,
      unitId: defaultUnit.id,
      priceListItems: [
        {
          priceListId: defaultPriceListId,
          netPrice,
          grossPrice,
          taxIds: defaultIva.length > 0 ? defaultIva : undefined,
        },
      ],
    });
  }

  const blocked = rowErrors.length > 0 || prepared.length === 0;
  return {
    success: true,
    rows: prepared,
    rowErrors,
    blocked,
  };
}
