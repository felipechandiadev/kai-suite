#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { DataSource, DeepPartial, IsNull, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { MinimalSeedModule } from '../minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
import {
  Person,
  PersonType,
  DocumentType,
} from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { AccountingAccount, AccountType } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule, RuleScope } from '@modules/accounting-rules/domain/accounting-rule.entity';
import {
  AccountingRuleLine,
  AccountingRuleLineAmountMode,
  AccountingRuleLineSide,
} from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { AutomationRule } from '@modules/automation/domain/automation-rule.entity';
import { AutomationAction } from '@modules/automation/domain/automation-action.entity';
import { AutomationEventType } from '@modules/automation/domain/automation-event-type.enum';
import { AutomationActionType } from '@modules/automation/domain/automation-action-type.enum';
import {
  ExpenseCategoryOperationalGroup,
} from '@modules/expense-categories/domain/expense-category-operational-group.enum';
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import {
  SEED_BRANCH_ADDRESS,
  SEED_BRANCH_LOCATION,
  SEED_BRANCH_NAME,
  SEED_BRANCH_PHONE,
  SEED_CASH_HUB_CODE,
  SEED_CASH_HUB_NAME,
  SEED_PARABRISAS,
  SEED_POS_NAME,
  SEED_PRICE_LIST_NAME,
  SEED_STORAGE_SALA_CODE,
  SEED_STORAGE_SALA_NAME,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedPosPaymentList,
} from './seed-parabrisas-config';

/** Seed legacy Parabrisas / vidrios — usar `npm run seed:legacy`. */

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

const SEED_HONORARIUM_RETENTION_NAME = 'Retención pago Honorarios';
const SEED_HONORARIUM_RETENTION_DESCRIPTION =
  'Retención de impuesto aplicable al pago de honorarios (tasa referencial 15,25%).';

/** Almacén seed retirado; se elimina (soft) si quedó de corridas anteriores. */
const SEED_REMOVED_STORAGE_CODE = 'SEED-DEP-PRINCIPAL';

const SEED_UNIT_BASE_NAME = 'Unidad';
const SEED_UNIT_BASE_SYMBOL = 'un';

/** Unidades que el seed ya no crea; se eliminan (soft) si existen de corridas anteriores. */
const SEED_REMOVED_UNIT_SYMBOLS = ['doc', 'gr', 'kg'] as const;

/** Categorías de producto (catálogo sala de venta / vidrios). */
const SEED_PRODUCT_CATEGORIES = [
  'Accesorios',
  'Parabrisas',
  'Lunetas',
  'Vidrios Puerta',
  'Aletas',
  'Ampolletas',
] as const;

const LEGACY_SEED_CATEGORY_NAMES = ['CAT 01', 'CAT 02'] as const;

const SEED_ANO_ATTRIBUTE_NAME = 'AÑO';

const LEGACY_SEED_ATTRIBUTE_NAMES = [
  'TALLA',
  'COLOR',
  'MATERIAL',
  'ORIGEN',
  'MOLIENDA',
  'PESO',
  'MARCA DE AUTO',
] as const;

/** Catálogo de marcas de vehículo (vidrios / repuestos). Fuente: data-to-seed/marcas-autos.json */
function loadSeedMarcasAutos(): string[] {
  const candidates = [
    path.join(__dirname, 'data', 'marcas-autos.json'),
    path.resolve(__dirname, '../../../data-to-seed/marcas-autos.json'),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) {
      throw new Error(`marcas-autos.json inválido en ${filePath}: se esperaba un array`);
    }
    const names = [
      ...new Set(
        raw
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter((x): x is string => x.length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'));
    if (names.length === 0) {
      throw new Error(`marcas-autos.json vacío en ${filePath}`);
    }
    return names;
  }
  throw new Error(
    'No se encontró marcas-autos.json (backend/src/seed/data/ o data-to-seed/)',
  );
}

/** Años/rangos unificados para vidrios. Fuente: data-to-seed/anos-unicos.json */
function loadSeedAnosUnicos(): string[] {
  const candidates = [
    path.join(__dirname, 'data', 'anos-unicos.json'),
    path.resolve(__dirname, '../../../data-to-seed/anos-unicos.json'),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) {
      throw new Error(`anos-unicos.json inválido en ${filePath}: se esperaba un array`);
    }
    const options = [
      ...new Set(
        raw
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter((x): x is string => x.length > 0),
      ),
    ];
    if (options.length === 0) {
      throw new Error(`anos-unicos.json vacío en ${filePath}`);
    }
    return options;
  }
  throw new Error(
    'No se encontró anos-unicos.json (backend/src/seed/data/ o data-to-seed/)',
  );
}

const SEED_CATALOGO_IVA_TASA = 0.19;

type CatalogoProductoSeedRow = {
  codigo?: string | null;
  nombre: string;
  categoria: string;
  anio?: string | null;
  sku: string;
  precioVentaConIva?: number | null;
  precioNeto?: number | null;
  precioNoDisponibleEnExcel?: boolean;
};

type PreciosSalaStockMaps = {
  byCodigo: Map<string, number>;
  byNombre: Map<string, number>;
};

function parsePreciosSalaStockQty(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

/** Stock físico por fila Excel (`N°`) en precios-sala-de-venta.json. */
function loadPreciosSalaVentaStockMaps(): PreciosSalaStockMaps {
  const candidates = [
    path.resolve(__dirname, '../../../data-to-seed/precios-sala-de-venta.json'),
    path.join(__dirname, 'data', 'precios-sala-de-venta.json'),
  ];
  const byCodigo = new Map<string, number>();
  const byNombre = new Map<string, number>();
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { rows?: unknown[] };
    if (!Array.isArray(raw.rows)) {
      throw new Error(
        `precios-sala-de-venta.json inválido en ${filePath}: falta array rows`,
      );
    }
    for (const item of raw.rows) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const row = item as Record<string, unknown>;
      const qty = parsePreciosSalaStockQty(row['N°']);
      if (qty === null) {
        continue;
      }
      const codigoRaw = row.CODIGO;
      const codigo =
        codigoRaw === null || codigoRaw === undefined
          ? ''
          : String(codigoRaw).trim();
      if (codigo) {
        byCodigo.set(codigo, qty);
        continue;
      }
      const nombre =
        typeof row.PRODUCTO === 'string' ? row.PRODUCTO.trim() : '';
      if (nombre) {
        byNombre.set(nombre, qty);
      }
    }
    return { byCodigo, byNombre };
  }
  console.warn(
    '⚠️  precios-sala-de-venta.json no encontrado; stock catálogo quedará en 0',
  );
  return { byCodigo, byNombre };
}

function resolvePreciosSalaStockQty(
  row: CatalogoProductoSeedRow,
  maps: PreciosSalaStockMaps,
): number {
  if (row.codigo) {
    const byCode = maps.byCodigo.get(row.codigo);
    if (byCode !== undefined) {
      return byCode;
    }
  }
  const bySku = maps.byCodigo.get(row.sku);
  if (bySku !== undefined) {
    return bySku;
  }
  const byName = maps.byNombre.get(row.nombre.trim());
  if (byName !== undefined) {
    return byName;
  }
  return 0;
}

/** Catálogo sala de venta / vidrios. Fuente: catalogo-productos-seed.json */
function loadSeedCatalogoProductos(): CatalogoProductoSeedRow[] {
  const candidates = [
    path.join(__dirname, 'data', 'catalogo-productos-seed.json'),
    path.resolve(__dirname, '../../../data-to-seed/catalogo-productos-seed.json'),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      productos?: unknown;
    };
    if (!Array.isArray(raw.productos)) {
      throw new Error(
        `catalogo-productos-seed.json inválido en ${filePath}: falta array productos`,
      );
    }
    const productos: CatalogoProductoSeedRow[] = [];
    for (const item of raw.productos) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const nombre = typeof row.nombre === 'string' ? row.nombre.trim() : '';
      const sku = typeof row.sku === 'string' ? row.sku.trim() : '';
      const categoria =
        typeof row.categoria === 'string' ? row.categoria.trim() : '';
      if (!nombre || !sku || !categoria) continue;
      productos.push({
        codigo:
          row.codigo === null || row.codigo === undefined
            ? null
            : String(row.codigo).trim() || null,
        nombre,
        categoria,
        anio:
          typeof row.anio === 'string' && row.anio.trim()
            ? row.anio.trim()
            : null,
        sku,
        precioVentaConIva:
          typeof row.precioVentaConIva === 'number' &&
          Number.isFinite(row.precioVentaConIva)
            ? Math.round(row.precioVentaConIva)
            : 0,
        precioNeto:
          typeof row.precioNeto === 'number' && Number.isFinite(row.precioNeto)
            ? Math.round(row.precioNeto)
            : null,
        precioNoDisponibleEnExcel: row.precioNoDisponibleEnExcel === true,
      });
    }
    if (productos.length === 0) {
      throw new Error(`catalogo-productos-seed.json vacío en ${filePath}`);
    }
    return productos;
  }
  throw new Error(
    'No se encontró catalogo-productos-seed.json (backend/src/seed/data/ o data-to-seed/)',
  );
}

function buildSeedAttributes(): readonly {
  name: string;
  options: readonly string[];
  displayOrder: number;
}[] {
  return [
    {
      name: SEED_ANO_ATTRIBUTE_NAME,
      options: loadSeedAnosUnicos(),
      displayOrder: 0,
    },
  ];
}

const SEED_ACCOUNTING_ACCOUNTS: readonly {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  isActive?: boolean;
}[] = [
  // Assets
  { code: '1000', name: 'Activos', type: AccountType.ASSET },
  { code: '1100', name: 'Caja y bancos', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1101', name: 'Caja', type: AccountType.ASSET, parentCode: '1100' },
  { code: '1102', name: 'Banco', type: AccountType.ASSET, parentCode: '1100' },
  {
    code: '1110',
    name: 'Efectivo centros de acopio',
    type: AccountType.ASSET,
    parentCode: '1100',
  },
  { code: '1200', name: 'Cuentas por cobrar', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1201', name: 'Clientes', type: AccountType.ASSET, parentCode: '1200' },

  // Liabilities
  { code: '2000', name: 'Pasivos', type: AccountType.LIABILITY },
  { code: '2100', name: 'Cuentas por pagar', type: AccountType.LIABILITY, parentCode: '2000' },
  { code: '2101', name: 'Proveedores', type: AccountType.LIABILITY, parentCode: '2100' },

  // Equity
  { code: '3000', name: 'Patrimonio', type: AccountType.EQUITY },
  { code: '3100', name: 'Capital', type: AccountType.EQUITY, parentCode: '3000' },
  { code: '3101', name: 'Capital social', type: AccountType.EQUITY, parentCode: '3100' },

  // Income
  { code: '4000', name: 'Ingresos', type: AccountType.INCOME },
  { code: '4100', name: 'Ventas', type: AccountType.INCOME, parentCode: '4000' },
  { code: '4101', name: 'Ventas (mercaderías)', type: AccountType.INCOME, parentCode: '4100' },

  // Expenses
  { code: '5000', name: 'Gastos', type: AccountType.EXPENSE },
  { code: '5100', name: 'Costo de ventas', type: AccountType.EXPENSE, parentCode: '5000' },
  { code: '5101', name: 'Costo de mercaderías', type: AccountType.EXPENSE, parentCode: '5100' },
  { code: '5200', name: 'Gastos operativos', type: AccountType.EXPENSE, parentCode: '5000' },
  { code: '5201', name: 'Gastos operativos varios', type: AccountType.EXPENSE, parentCode: '5200' },
] as const;

const SEED_EXPENSE_CATEGORIES: readonly {
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroup;
}[] = [
  { name: 'Sueldos', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Horas extra', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Cargas sociales', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Capacitación operativa', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Arriendo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Gastos comunes', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Mantención', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Limpieza', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Seguridad física', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Embalaje', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  { name: 'Útiles', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  { name: 'Materiales no inventariables', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  {
    name: 'EPP (Elementos de Protección Personal)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
  },
  { name: 'Flete', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Courier', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Combustible operativo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Peajes', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Almacenaje externo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Software recurrente', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Hosting', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'POS (Puntos de Venta)', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Soporte', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Licencias', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  {
    name: 'Promociones en tienda',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Señalética',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Muestras',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Contabilidad/tributario recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
  },
  { name: 'Retainer legal', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS },
  { name: 'Auditorías', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS },
  {
    name: 'Comisiones bancarias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
  },
  { name: 'Seguros operativos', operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA },
  {
    name: 'Costos de líneas de crédito',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
  },
  {
    name: 'Mermas autorizadas',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Diferencias de caja menores',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Obsolescencia (gasto operativo)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Permisos municipales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
  {
    name: 'Fiscalización',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
  {
    name: 'Certificaciones obligatorias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
] as const;

const SEED_SUPPLIERS: readonly {
  person: {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  supplier: {
    supplierType: SupplierType;
    alias?: string;
    defaultPaymentTermDays: number;
    isActive: boolean;
    notes?: string;
  };
}[] = [
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Comercial Andes SpA',
      businessName: 'Comercial Andes SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.123.456-7',
      email: 'contacto@andes-proveedores.cl',
      phone: '+56 9 6123 4567',
      address: 'Av. Providencia 1234, Santiago',
    },
    supplier: {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'Andes',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Distribuidor multirubro con despacho nacional.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Textiles del Sur Ltda',
      businessName: 'Textiles del Sur Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '77.234.567-8',
      email: 'ventas@textilessur.cl',
      phone: '+56 41 245 7788',
      address: 'Ruta 5 Sur km 505, Temuco',
    },
    supplier: {
      supplierType: SupplierType.MANUFACTURER,
      alias: 'TextilSur',
      defaultPaymentTermDays: 45,
      isActive: true,
      notes: 'Fabricante directo; condiciones especiales por volumen.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'María',
      lastName: 'Pérez Soto',
      documentType: DocumentType.RUN,
      documentNumber: '15.876.543-2',
      email: 'maria.perez@servicios.cl',
      phone: '+56 9 9988 7766',
      address: 'Los Canelos 778, Talca',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      defaultPaymentTermDays: 0,
      isActive: true,
      notes: 'Servicio local con pago contra entrega.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'John',
      lastName: 'Miller',
      documentType: DocumentType.PASSPORT,
      documentNumber: 'P99887766',
      email: 'john.miller@imports.com',
      phone: '+1 305 555 1122',
      address: '745 Brickell Ave, Miami',
    },
    supplier: {
      supplierType: SupplierType.IMPORTER,
      alias: 'JM Imports',
      defaultPaymentTermDays: 60,
      isActive: true,
      notes: 'Proveedor importado con lead time variable.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Envases Pacifico S.A.',
      businessName: 'Envases Pacifico S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '96.345.678-9',
      email: 'contacto@envasespacifico.cl',
      address: 'Camino a Melipilla 8800, Maipú',
    },
    supplier: {
      supplierType: SupplierType.MANUFACTURER,
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Especialista en packaging y consumibles.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Servicios Tributarios Integrales EIRL',
      businessName: 'Servicios Tributarios Integrales EIRL',
      documentType: DocumentType.RUT,
      documentNumber: '76.876.543-1',
      email: 'admin@sti.cl',
      phone: '+56 2 2677 8899',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'STI',
      defaultPaymentTermDays: 10,
      isActive: false,
      notes: 'Proveedor inactivo para pruebas de filtro.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Andrea',
      lastName: 'Rojas',
      documentType: DocumentType.DNI,
      documentNumber: 'PROV-AR-001',
      phone: '+56 9 4321 1000',
      address: 'Pasaje Las Flores 120, Chillán',
    },
    supplier: {
      supplierType: SupplierType.CONTRACTOR,
      alias: 'A. Rojas',
      defaultPaymentTermDays: 7,
      isActive: true,
      notes: 'Proveedor sin email para validar campos opcionales.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Mayorista Central SPA',
      businessName: 'Mayorista Central SPA',
      documentType: DocumentType.RUT,
      documentNumber: '77.987.654-3',
      email: 'compras@mayoristacentral.cl',
      phone: '+56 2 2987 1200',
      address: 'Av. Matta 3400, Santiago',
    },
    supplier: {
      supplierType: SupplierType.WHOLESALER,
      defaultPaymentTermDays: 90,
      isActive: true,
      notes: 'Mayorista con crédito amplio y despacho semanal.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Carlos',
      lastName: 'Gutiérrez',
      documentType: DocumentType.RUN,
      documentNumber: '12.345.678-5',
      email: 'carlos.gutierrez@logistica.cl',
      address: 'Los Aromos 450, Rancagua',
    },
    supplier: {
      supplierType: SupplierType.LOGISTICS,
      defaultPaymentTermDays: 21,
      isActive: true,
      notes: 'Distribución regional zona centro sur.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Tecnologia Retail Hub SpA',
      businessName: 'Tecnologia Retail Hub SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.654.321-0',
      email: 'soporte@retailhub.cl',
      phone: '+56 2 2555 7788',
      address: 'Av. Apoquindo 4800, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'RetailHub',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Proveedor de hardware POS y licenciamiento.',
    },
  },
] as const;

/**
 * Catálogo de clientes demo. Cubre personas naturales y empresas, con
 * distintos días de pago programado y límites de crédito (incluyendo
 * crédito en 0 para pruebas), un cliente inactivo, RUTs y RUN/PASS.
 */
const SEED_CUSTOMERS: readonly {
  person: {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  customer: {
    creditLimit: number;
    paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
    isActive: boolean;
    notes?: string;
  };
}[] = [
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Sebastián',
      lastName: 'Fuentes Vargas',
      documentType: DocumentType.RUN,
      documentNumber: '16.345.789-2',
      email: 'sebastian.fuentes@gmail.com',
      phone: '+56 9 8123 4567',
      address: 'Calle Los Olivos 234, Parral',
    },
    customer: {
      creditLimit: 0,
      paymentDayOfMonth: 5,
      isActive: true,
      notes: 'Cliente contado (sin crédito).',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Camila',
      lastName: 'Ríos Soto',
      documentType: DocumentType.RUN,
      documentNumber: '18.999.111-K',
      email: 'camila.rios@hotmail.com',
      phone: '+56 9 7456 1234',
      address: 'Pasaje El Sauce 78, Linares',
    },
    customer: {
      creditLimit: 150000,
      paymentDayOfMonth: 10,
      isActive: true,
      notes: 'Crédito acotado para compras recurrentes.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Restaurante Costanera SpA',
      businessName: 'Restaurante Costanera SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.555.222-K',
      email: 'compras@costaneraresto.cl',
      phone: '+56 73 222 5566',
      address: 'Av. Costanera 1500, Constitución',
    },
    customer: {
      creditLimit: 800000,
      paymentDayOfMonth: 15,
      isActive: true,
      notes: 'Cliente B2B con crédito y pago a 30 días.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Distribuidora Andes Norte Ltda',
      businessName: 'Distribuidora Andes Norte Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '77.888.123-4',
      email: 'pagos@andesnorte.cl',
      phone: '+56 55 245 7700',
      address: 'Av. Argentina 2200, Antofagasta',
    },
    customer: {
      creditLimit: 1500000,
      paymentDayOfMonth: 20,
      isActive: true,
      notes: 'Mayorista regional zona norte.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Patricia',
      lastName: 'Núñez Carrasco',
      documentType: DocumentType.RUN,
      documentNumber: '14.555.222-7',
      email: 'patricia.nunez@correo.cl',
      phone: '+56 9 6321 9988',
      address: 'Los Aromos 220, Talca',
    },
    customer: {
      creditLimit: 300000,
      paymentDayOfMonth: 25,
      isActive: true,
      notes: 'Cliente frecuente con crédito mediano.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Café del Valle SPA',
      businessName: 'Café del Valle SPA',
      documentType: DocumentType.RUT,
      documentNumber: '76.111.789-6',
      email: 'admin@cafedelvalle.cl',
      address: 'Av. Bernardo O\'Higgins 980, Curicó',
    },
    customer: {
      creditLimit: 500000,
      paymentDayOfMonth: 30,
      isActive: true,
      notes: 'Reventa de café; pago fin de mes.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Diego',
      lastName: 'Pérez Lagos',
      documentType: DocumentType.RUN,
      documentNumber: '19.876.543-2',
      email: 'diego.perez@protonmail.com',
      phone: '+56 9 5555 3322',
    },
    customer: {
      creditLimit: 0,
      paymentDayOfMonth: 5,
      isActive: true,
      notes: 'Cliente contado sin domicilio cargado (campos opcionales).',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Mark',
      lastName: 'Johnson',
      documentType: DocumentType.PASSPORT,
      documentNumber: 'P12345678',
      email: 'mark.johnson@global.com',
      phone: '+1 415 555 0199',
      address: '1 Market St, San Francisco',
    },
    customer: {
      creditLimit: 0,
      paymentDayOfMonth: 10,
      isActive: true,
      notes: 'Cliente con pasaporte para validar tipo de documento.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Almacenes El Roble EIRL',
      businessName: 'Almacenes El Roble EIRL',
      documentType: DocumentType.RUT,
      documentNumber: '76.444.999-1',
      email: 'contacto@elroble.cl',
      phone: '+56 71 244 0099',
      address: 'Avenida 21 de Mayo 450, Cauquenes',
    },
    customer: {
      creditLimit: 250000,
      paymentDayOfMonth: 15,
      isActive: false,
      notes: 'Cliente inactivo para pruebas de filtro.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Valentina',
      lastName: 'Sánchez',
      documentType: DocumentType.DNI,
      documentNumber: 'CUST-VS-001',
      phone: '+56 9 4444 1212',
    },
    customer: {
      creditLimit: 100000,
      paymentDayOfMonth: 20,
      isActive: true,
      notes: 'Documento DNI (validar campo opcional documentType).',
    },
  },
] as const;

/** Tablas en `public` que no deben truncarse (extensiones PostGIS u otras). */
const TRUNCATE_EXCLUDE_TABLES = new Set([
  'spatial_ref_sys',
  'geometry_columns',
  'geography_columns',
  'raster_columns',
  'raster_overviews',
]);

/**
 * Vacía todas las tablas del esquema `public` (reinicia secuencias).
 * Usar solo en entornos de desarrollo con `npm run seed`.
 */
async function truncateAllPublicTables(dataSource: DataSource): Promise<void> {
  const schema = 'public';
  const rows = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
    [schema],
  );
  const names = rows
    .map((r) => r.tablename)
    .filter((t) => !TRUNCATE_EXCLUDE_TABLES.has(t));
  if (names.length === 0) {
    console.log(`⚠️  No hay tablas para truncar en ${schema}.`);
    return;
  }
  const quoted = names.map((n) => `"${n.replace(/"/g, '""')}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  console.log(
    `✅ Base de datos limpiada: ${names.length} tabla(s) en «${schema}» (TRUNCATE … CASCADE).`,
  );
}

/**
 * Si la migración del triplete UoM no corrió, el ORM sigue esperando
 * `stock_base_unit_id` / `sale_unit_id` / `purchase_unit_id`. DDL idempotente.
 */
async function ensureProductVariantUomTripletColumns(
  dataSource: DataSource,
): Promise<void> {
  const rows = await dataSource.query<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'product_variants'
       AND column_name IN ('stock_base_unit_id', 'sale_unit_id', 'purchase_unit_id')`,
  );
  if (rows.length < 3) {
    console.log(
      '⚙️  Aplicando columnas UoM en product_variants (stock / venta / compra)…',
    );

    await dataSource.query(`
    ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "stock_base_unit_id" uuid,
      ADD COLUMN IF NOT EXISTS "sale_unit_id" uuid,
      ADD COLUMN IF NOT EXISTS "purchase_unit_id" uuid
  `);

    await dataSource.query(`
    UPDATE "product_variants"
    SET
      "stock_base_unit_id" = COALESCE("stock_base_unit_id", "unit_id"),
      "sale_unit_id" = COALESCE("sale_unit_id", "unit_id"),
      "purchase_unit_id" = COALESCE("purchase_unit_id", "unit_id")
    WHERE "stock_base_unit_id" IS NULL
       OR "sale_unit_id" IS NULL
       OR "purchase_unit_id" IS NULL
  `);

    await dataSource.query(`
    ALTER TABLE "product_variants"
      ALTER COLUMN "stock_base_unit_id" SET NOT NULL,
      ALTER COLUMN "sale_unit_id" SET NOT NULL,
      ALTER COLUMN "purchase_unit_id" SET NOT NULL
  `);
  }

  await dataSource.query(`
    DO $$ BEGIN
      ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_stock_base_unit"
        FOREIGN KEY ("stock_base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await dataSource.query(`
    DO $$ BEGIN
      ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_sale_unit"
        FOREIGN KEY ("sale_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await dataSource.query(`
    DO $$ BEGIN
      ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_purchase_unit"
        FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  console.log('✅ Columnas y FKs UoM de product_variants verificadas.');
}

async function ensurePointsOfSaleStorageColumn(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    ALTER TABLE "points_of_sale" ADD COLUMN IF NOT EXISTS "storage_id" uuid
  `);
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_points_of_sale_storage'
      ) THEN
        ALTER TABLE "points_of_sale"
        ADD CONSTRAINT "fk_points_of_sale_storage"
        FOREIGN KEY ("storage_id") REFERENCES "storages"("id") ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);
  console.log('✅ Columna points_of_sale.storage_id verificada.');
}

async function ensureStockLevelThresholdColumns(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "minimum_stock" integer NULL
  `);
  await dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "maximum_stock" integer NULL
  `);
  await dataSource.query(`
    ALTER TABLE "stock_levels"
    ADD COLUMN IF NOT EXISTS "reorder_point" integer NULL
  `);
  console.log('✅ Columnas stock_levels (umbrales por bodega) verificadas.');
}

async function ensureProductVariantShippingColumns(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS net_weight_kg numeric(14,6) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS gross_weight_kg numeric(14,6) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_length_cm numeric(12,3) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_width_cm numeric(12,3) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS package_height_cm numeric(12,3) NULL
  `);
  await dataSource.query(`
    ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS volumetric_divisor_k integer NULL
  `);
  console.log('✅ Columnas product_variants (logística / envío) verificadas.');
}

/**
 * Tabla `brands` y columna `products.brand_id` + FK (migración 1756000000000).
 * Idempotente: permite correr el seed sin haber ejecutado migraciones antes.
 */
async function ensureBrandsTableAndProductBrandId(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL,
      name character varying(255) NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      deleted_at TIMESTAMP,
      CONSTRAINT "PK_brands" PRIMARY KEY (id)
    );
  `);
  await dataSource.query(`
    ALTER TABLE brands
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
  `);
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_company_name"
    ON brands (company_id, name)
    WHERE deleted_at IS NULL;
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "idx_brands_company_id" ON brands (company_id);
  `);
  await dataSource.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS brand_id uuid;
  `);
  await dataSource.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_brand'
      ) THEN
        ALTER TABLE products
        ADD CONSTRAINT "FK_products_brand"
        FOREIGN KEY (brand_id) REFERENCES brands(id)
        ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "idx_products_brand_id" ON products (brand_id);
  `);
  console.log('✅ Tabla brands y columna products.brand_id verificadas.');
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);

    // Ensure new tables exist even if DB_SYNCHRONIZE is off.
    // This seed is used in dev environments and must stay resilient.
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS accounting_rule_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ruleId" uuid NOT NULL,
        side varchar(20) NOT NULL,
        "accountId" uuid NOT NULL,
        "amountMode" varchar(20) NOT NULL,
        "amountValue" numeric(15,2),
        "sortOrder" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_accounting_rule_lines_rule FOREIGN KEY ("ruleId") REFERENCES accounting_rules(id) ON DELETE CASCADE,
        CONSTRAINT fk_accounting_rule_lines_account FOREIGN KEY ("accountId") REFERENCES accounting_accounts(id) ON DELETE RESTRICT
      );
    `);
    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_rule_lines_rule_sort
      ON accounting_rule_lines ("ruleId", "sortOrder");
    `);

    // ---------------------------------------------------------------------
    // Automation tables (MVP: rules + actions)
    // ---------------------------------------------------------------------
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "eventType" varchar(60) NOT NULL,
        filters json,
        priority int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_automation_rules_company_event_active
      ON automation_rules ("companyId", "eventType", "isActive");
    `);
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS automation_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ruleId" uuid NOT NULL,
        type varchar(80) NOT NULL,
        params json,
        "sortOrder" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_automation_actions_rule FOREIGN KEY ("ruleId") REFERENCES automation_rules(id) ON DELETE CASCADE
      );
    `);
    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_actions_rule_sort
      ON automation_actions ("ruleId", "sortOrder");
    `);

    // Variantes: historial PMP (JSON). Migración 010; necesario si DB_SYNCHRONIZE está off.
    await dataSource.query(
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "pmpHistory" json`,
    );
    await dataSource.query(
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS "salePriceHistory" json`,
    );
    await dataSource.query(`ALTER TABLE product_variants ALTER COLUMN pmp DROP DEFAULT`);
    await dataSource.query(
      `ALTER TABLE product_variants ALTER COLUMN pmp DROP NOT NULL`,
    );

    if (process.env.SEED_SKIP_TRUNCATE === 'true') {
      console.log(
        '⚠️  SEED_SKIP_TRUNCATE=true — no se truncan tablas (datos previos se mezclan con el seed).',
      );
    } else {
      console.log('🧹 Limpiando todas las tablas (schema public) antes del seed…');
      await truncateAllPublicTables(dataSource);
    }

    await ensureProductVariantUomTripletColumns(dataSource);

    await ensurePointsOfSaleStorageColumn(dataSource);
    await ensureStockLevelThresholdColumns(dataSource);
    await ensureProductVariantShippingColumns(dataSource);
    await ensureBrandsTableAndProductBrandId(dataSource);
    const personRepo = dataSource.getRepository(Person);
    const companyRepo = dataSource.getRepository(Company);
    const taxRepo = dataSource.getRepository(Tax);
    const branchRepo = dataSource.getRepository(Branch);
    const unitRepo = dataSource.getRepository(Unit);
    const categoryRepo = dataSource.getRepository(Category);
    const attributeRepo = dataSource.getRepository(Attribute);
    const priceListRepo = dataSource.getRepository(PriceList);
    const posRepo = dataSource.getRepository(PointOfSale);
    const cashHubRepo = dataSource.getRepository(CashHub);
    const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
    const supplierRepo = dataSource.getRepository(Supplier);
    const customerRepo = dataSource.getRepository(Customer);
    const shareholderRepo = dataSource.getRepository(Shareholder);
    const accountingAccountRepo = dataSource.getRepository(AccountingAccount);
    const accountingRuleRepo = dataSource.getRepository(AccountingRule);
    const accountingRuleLineRepo = dataSource.getRepository(AccountingRuleLine);
    const automationRuleRepo = dataSource.getRepository(AutomationRule);
    const automationActionRepo = dataSource.getRepository(AutomationAction);
    const userRepo = dataSource.getRepository(User);

    const userName = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@kai.local';
    const razonSocial =
      process.env.SEED_COMPANY_RAZON_SOCIAL || SEED_PARABRISAS.razonSocial;
    const nombreFantasia =
      process.env.SEED_NOMBRE_FANTASIA || SEED_PARABRISAS.nombreFantasia;
    const businessActivity =
      process.env.SEED_BUSINESS_ACTIVITY || SEED_PARABRISAS.businessActivity;
    const rut = process.env.SEED_COMPANY_RUT || SEED_PARABRISAS.rut;
    const companyAddress =
      process.env.SEED_COMPANY_ADDRESS || SEED_PARABRISAS.address;
    const companyMail =
      process.env.SEED_COMPANY_MAIL || SEED_PARABRISAS.mail;
    const companyPhone =
      process.env.SEED_COMPANY_PHONE || SEED_PARABRISAS.phone;

    assertValidChileCompanyRut(rut, 'SEED_COMPANY_RUT');

    let company = await companyRepo.findOne({
      where: { rut, deletedAt: null as never },
    });
    if (!company) {
      company = companyRepo.create({
        razonSocial,
        nombreFantasia,
        businessActivity,
        rut,
        address: companyAddress,
        mail: companyMail,
        phone: companyPhone,
        defaultCurrency: SEED_PARABRISAS.defaultCurrency,
        isActive: true,
      });
      await companyRepo.save(company);
      console.log(
        `✅ Empresa creada: id=${company.id} razonSocial='${razonSocial}' rut='${rut}'`,
      );
    } else {
      company.razonSocial = razonSocial;
      company.nombreFantasia = nombreFantasia;
      company.businessActivity = businessActivity;
      company.address = companyAddress;
      company.mail = companyMail;
      company.phone = companyPhone;
      await companyRepo.save(company);
      console.log(
        `✅ Empresa ya existía: id=${company.id} razonSocial='${company.razonSocial}' rut='${company.rut}' (datos básicos actualizados)`,
      );
    }

    const seedBankRows = buildSeedCompanyBankAccounts(company.razonSocial);
    const byKey = new Map(
      (company.bankAccounts ?? []).map((a) => [
        a.accountKey ?? `${String(a.bankName)}_${a.accountNumber}`,
        a,
      ] as const),
    );
    for (const row of seedBankRows) {
      byKey.set(row.accountKey!, row);
    }
    company.bankAccounts = Array.from(byKey.values());
    await companyRepo.save(company);
    console.log(
      `✅ Cuentas bancarias ejemplo sincronizadas (${seedBankRows.length}) companyId=${company.id}`,
    );

  /**
   * Settings de empresa (Parabrisas Don Walter): medios de pago, cheques,
   * cotizaciones y crédito interno. Se sincronizan en cada seed.
   */
    const seedCompanyPaymentCatalog = buildSeedCompanyPaymentCatalog();
    company.settings = buildSeedCompanySettings(
      company.settings as Record<string, unknown> | undefined,
      seedCompanyPaymentCatalog,
    );
    await companyRepo.save(company);
    console.log(
      `✅ Settings empresa sincronizados: medios (${seedCompanyPaymentCatalog
        .map((c) => c.method)
        .join(', ')}), cotizaciones 10/20 días, cheques off, crédito interno off`,
    );

    /**
     * A partir de aquí, todo el resto del seed se ejecuta dentro del
     * `TenantContext` de la empresa creada. Esto activa el
     * `TenantSubscriber` (registrado en typeorm.config.ts), que
     * autopopula `companyId` en cualquier INSERT de entidades
     * multi-empresa que no lo provean explícitamente. Sin esto, las
     * tablas con `company_id NOT NULL` (storages, products,
     * categories, units, attributes, persons, suppliers, etc.) fallan
     * porque el seed corre fuera del request scope.
     */
    await TenantContext.run(
      { activeCompanyId: company.id, userId: null, rol: null },
      async () => {

    let ivaTax = await taxRepo.findOne({
      where: {
        companyId: company.id,
        name: 'IVA',
        taxType: TaxType.IVA,
      },
    });
    if (!ivaTax) {
      ivaTax = taxRepo.create({
        companyId: company.id,
        name: 'IVA',
        code: null,
        taxType: TaxType.IVA,
        rate: 19,
        description: SEED_IVA_DESCRIPTION,
        isDefault: false,
        isActive: true,
        nonDeletable: true,
      });
      await taxRepo.save(ivaTax);
      console.log(
        `✅ Impuesto ejemplo creado: IVA 19% id=${ivaTax.id} companyId=${company.id}`,
      );
    } else {
      ivaTax.code = null;
      ivaTax.rate = 19;
      ivaTax.description = SEED_IVA_DESCRIPTION;
      ivaTax.isDefault = false;
      ivaTax.isActive = true;
      ivaTax.taxType = TaxType.IVA;
      ivaTax.nonDeletable = true;
      await taxRepo.save(ivaTax);
      console.log(
        `✅ Impuesto ejemplo IVA ya existía: id=${ivaTax.id} (sincronizado con seed)`,
      );
    }

    let honorariumRetentionTax = await taxRepo.findOne({
      where: {
        companyId: company.id,
        name: SEED_HONORARIUM_RETENTION_NAME,
        taxType: TaxType.RETENTION,
      },
    });
    if (!honorariumRetentionTax) {
      honorariumRetentionTax = taxRepo.create({
        companyId: company.id,
        name: SEED_HONORARIUM_RETENTION_NAME,
        code: null,
        taxType: TaxType.RETENTION,
        rate: 15.25,
        description: SEED_HONORARIUM_RETENTION_DESCRIPTION,
        isDefault: false,
        isActive: true,
        nonDeletable: true,
      });
      await taxRepo.save(honorariumRetentionTax);
      console.log(
        `✅ Impuesto ejemplo creado: ${SEED_HONORARIUM_RETENTION_NAME} 15,25% id=${honorariumRetentionTax.id} companyId=${company.id}`,
      );
    } else {
      honorariumRetentionTax.code = null;
      honorariumRetentionTax.rate = 15.25;
      honorariumRetentionTax.description = SEED_HONORARIUM_RETENTION_DESCRIPTION;
      honorariumRetentionTax.isDefault = false;
      honorariumRetentionTax.isActive = true;
      honorariumRetentionTax.taxType = TaxType.RETENTION;
      honorariumRetentionTax.nonDeletable = true;
      await taxRepo.save(honorariumRetentionTax);
      console.log(
        `✅ Impuesto ejemplo ${SEED_HONORARIUM_RETENTION_NAME} ya existía: id=${honorariumRetentionTax.id} (sincronizado con seed)`,
      );
    }

    // ---------------------------------------------------------------------
    // Accounting accounts (plan de cuentas mínimo)
    // ---------------------------------------------------------------------
    const existingAccounts = await accountingAccountRepo.find({
      where: { companyId: company.id },
      order: { code: 'ASC' },
    });
    const byCode = new Map(existingAccounts.map((a) => [a.code, a]));

    // First pass: create/update roots and all accounts with parentCode resolved later.
    for (const item of SEED_ACCOUNTING_ACCOUNTS) {
      const prev = byCode.get(item.code);
      const row = prev
        ? Object.assign(prev, {
            companyId: company.id,
            code: item.code,
            name: item.name,
            type: item.type,
            isActive: item.isActive ?? true,
          })
        : accountingAccountRepo.create({
            companyId: company.id,
            code: item.code,
            name: item.name,
            type: item.type,
            parentId: null,
            isActive: item.isActive ?? true,
          });
      const saved = await accountingAccountRepo.save(row);
      byCode.set(saved.code, saved);
    }

    // Second pass: set parentId for those that have parentCode
    for (const item of SEED_ACCOUNTING_ACCOUNTS) {
      if (!item.parentCode) continue;
      const child = byCode.get(item.code);
      const parent = byCode.get(item.parentCode);
      if (!child || !parent) continue;
      const needsUpdate = (child.parentId ?? null) !== parent.id;
      if (needsUpdate) {
        child.parentId = parent.id;
        await accountingAccountRepo.save(child);
      }
    }

    console.log(
      `✅ Plan de cuentas mínimo sincronizado: companyId=${company.id} total=${SEED_ACCOUNTING_ACCOUNTS.length}`,
    );

    // ---------------------------------------------------------------------
    // Accounting rules (reglas mínimas por evento)
    // ---------------------------------------------------------------------
    const deleteRulesResult = await accountingRuleRepo
      .createQueryBuilder()
      .delete()
      .from(AccountingRule)
      .where('companyId = :companyId', { companyId: company.id })
      .execute();
    console.log(
      `✅ Reglas contables eliminadas para companyId=${company.id}: ${deleteRulesResult.affected ?? 0}`,
    );

    const acc = (code: string) => {
      const a = byCode.get(code);
      if (!a) {
        throw new Error(`Seed contable: falta cuenta code=${code}`);
      }
      return a.id;
    };

    const seedRules: Array<Partial<AccountingRule>> = [
      // Ventas: Caja/Banco (debe) contra Ventas (haber). Genérica (sin paymentMethod).
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'SALE' as any,
        debitAccountId: acc('1101'),
        creditAccountId: acc('4101'),
        priority: 0,
        isActive: true,
      },
      // Cobro a cliente: Banco (debe) contra Clientes (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'PAYMENT_IN' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('1201'),
        priority: 0,
        isActive: true,
      },
      // Compra: Costo mercaderías (debe) contra Proveedores (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'PURCHASE' as any,
        debitAccountId: acc('5101'),
        creditAccountId: acc('2101'),
        priority: 0,
        isActive: true,
      },
      // Pago a proveedor: Proveedores (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'SUPPLIER_PAYMENT' as any,
        debitAccountId: acc('2101'),
        creditAccountId: acc('1102'),
        priority: 0,
        isActive: true,
      },
      // Gasto operativo: Gastos operativos (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'OPERATING_EXPENSE' as any,
        debitAccountId: acc('5201'),
        creditAccountId: acc('1102'),
        priority: 0,
        isActive: true,
      },
      // Pago gasto operativo: Gastos operativos (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'EXPENSE_PAYMENT' as any,
        debitAccountId: acc('5201'),
        creditAccountId: acc('1102'),
        priority: 10,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CAPITAL_CONTRIBUTION' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('3101'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'BANK_WITHDRAWAL_TO_SHAREHOLDER' as any,
        debitAccountId: acc('3101'),
        creditAccountId: acc('1102'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CASH_DEPOSIT' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('1101'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CASH_WITHDRAWAL_TO_PETTY_CASH' as any,
        debitAccountId: acc('1101'),
        creditAccountId: acc('1102'),
        priority: 5,
        isActive: true,
      },
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'CASH_SESSION_TO_HUB_TRANSFER' as any,
        debitAccountId: acc('1110'),
        creditAccountId: acc('1101'),
        priority: 6,
        isActive: true,
      },
    ];

    for (const r of seedRules) {
      const row = accountingRuleRepo.create(r as any);
      const savedRule = (await accountingRuleRepo.save(
        row as any,
      )) as unknown as AccountingRule;
      // Crear líneas por defecto equivalentes al par débito/crédito.
      // Se setea `companyId` explícitamente porque la columna es NOT NULL
      // en multi-empresa y la entity no tiene default.
      const lines = [
        {
          companyId: company.id,
          ruleId: savedRule.id,
          side: AccountingRuleLineSide.DEBIT,
          accountId: (r.debitAccountId as string),
          amountMode: AccountingRuleLineAmountMode.TOTAL,
          amountValue: null,
          sortOrder: 0,
          isActive: true,
        },
        {
          companyId: company.id,
          ruleId: savedRule.id,
          side: AccountingRuleLineSide.CREDIT,
          accountId: (r.creditAccountId as string),
          amountMode: AccountingRuleLineAmountMode.TOTAL,
          amountValue: null,
          sortOrder: 1,
          isActive: true,
        },
      ];
      for (const l of lines) {
        await accountingRuleLineRepo.save(accountingRuleLineRepo.create(l as any));
      }
      console.log(
        `✅ Regla contable creada: type=${String(r.transactionType)} scope=${String(r.appliesTo)} priority=${r.priority} id=${savedRule.id}`,
      );
    }

    // ---------------------------------------------------------------------
    // Automation rules (transaction events -> actions)
    // ---------------------------------------------------------------------
    await automationActionRepo
      .createQueryBuilder()
      .delete()
      .from(AutomationAction)
      .where(`"ruleId" IN (SELECT id FROM automation_rules WHERE "companyId" = :companyId)`, {
        companyId: company.id,
      })
      .execute();
    await automationRuleRepo
      .createQueryBuilder()
      .delete()
      .from(AutomationRule)
      .where(`"companyId" = :companyId`, { companyId: company.id })
      .execute();

    const createAutomationRule = async (row: {
      eventType: AutomationEventType;
      filters?: Record<string, any> | null;
      priority?: number;
      isActive?: boolean;
      actions: Array<{
        type: AutomationActionType;
        sortOrder: number;
        isActive?: boolean;
        params?: Record<string, any> | null;
      }>;
    }) => {
      const saved = (await automationRuleRepo.save(
        automationRuleRepo.create({
          companyId: company.id,
          eventType: row.eventType,
          filters: row.filters ?? null,
          priority: row.priority ?? 0,
          isActive: row.isActive !== false,
        } as any),
      )) as unknown as AutomationRule;
      for (const a of row.actions) {
        await automationActionRepo.save(
          automationActionRepo.create({
            companyId: company.id,
            ruleId: saved.id,
            type: a.type,
            sortOrder: a.sortOrder ?? 0,
            isActive: a.isActive !== false,
            params: a.params ?? null,
          } as any),
        );
      }
      console.log(`✅ Automation rule creada: event=${row.eventType} id=${saved.id}`);
    };

    // SALE + deliveryMode=IMMEDIATE + contado -> ADJUSTMENT_OUT + PAYMENT_IN
    await createAutomationRule({
      eventType: AutomationEventType.TRANSACTION_CREATED,
      filters: {
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        'metadata.fulfillment.deliveryMode': 'IMMEDIATE',
      },
      priority: 0,
      isActive: true,
      actions: [
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 0,
          isActive: true,
          params: {
            transactionType: 'ADJUSTMENT_OUT',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'transform_cost',
            totalFrom: 'costTotal',
            setFields: { paymentStatus: 'PAID', amountPaid: 0 },
          },
        },
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 1,
          isActive: true,
          params: {
            transactionType: 'PAYMENT_IN',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'none',
            totalFrom: 'amountPaid',
            copyFields: ['paymentMethod', 'amountPaid', 'changeAmount', 'customerId'],
            setFields: { paymentStatus: 'PAID' },
          },
        },
      ],
    });

    // SALE + deliveryMode=DEFERRED + contado -> INVENTORY_RESERVATION + PAYMENT_IN
    await createAutomationRule({
      eventType: AutomationEventType.TRANSACTION_CREATED,
      filters: {
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        'metadata.fulfillment.deliveryMode': 'DEFERRED',
      },
      priority: 10,
      isActive: true,
      actions: [
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 0,
          isActive: true,
          params: {
            transactionType: 'INVENTORY_RESERVATION',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'transform_cost',
            totalFrom: 'costTotal',
            setFields: { paymentStatus: 'PAID', amountPaid: 0 },
          },
        },
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 1,
          isActive: true,
          params: {
            transactionType: 'PAYMENT_IN',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'none',
            totalFrom: 'amountPaid',
            copyFields: ['paymentMethod', 'amountPaid', 'changeAmount', 'customerId'],
            setFields: { paymentStatus: 'PAID' },
          },
        },
      ],
    });

    // Nota: reglas de PURCHASE y pagos posteriores se tratarán en flujos dedicados.

    let seedBranch = await branchRepo.findOne({
      where: { companyId: company.id, name: SEED_BRANCH_NAME },
      withDeleted: true,
    });
    if (!seedBranch) {
      seedBranch = branchRepo.create({
        companyId: company.id,
        name: SEED_BRANCH_NAME,
        address: SEED_BRANCH_ADDRESS,
        phone: SEED_BRANCH_PHONE,
        location: SEED_BRANCH_LOCATION,
        isActive: true,
        isHeadquarters: false,
      });
      await branchRepo.save(seedBranch);
      console.log(
        `✅ Sucursal ejemplo creada: «${SEED_BRANCH_NAME}» id=${seedBranch.id} companyId=${company.id}`,
      );
    } else {
      if (seedBranch.deletedAt) {
        seedBranch = await branchRepo.recover(seedBranch);
      }
      seedBranch.companyId = company.id;
      seedBranch.address = SEED_BRANCH_ADDRESS;
      seedBranch.phone = SEED_BRANCH_PHONE;
      seedBranch.location = SEED_BRANCH_LOCATION;
      seedBranch.isActive = true;
      seedBranch.isHeadquarters = false;
      await branchRepo.save(seedBranch);
      console.log(
        `✅ Sucursal ejemplo «${SEED_BRANCH_NAME}» ya existía: id=${seedBranch.id} (sincronizado con seed)`,
      );
    }

    // Almacén ejemplo: sala de venta en sucursal seed (único almacén del seed)
    const storageRepo = dataSource.getRepository(Storage);

    let seedSalaVenta = await storageRepo.findOne({
      where: { companyId: company.id, code: SEED_STORAGE_SALA_CODE },
      withDeleted: true,
    });
    if (!seedSalaVenta) {
      seedSalaVenta = storageRepo.create({
        companyId: company.id,
        name: SEED_STORAGE_SALA_NAME,
        code: SEED_STORAGE_SALA_CODE,
        branchId: seedBranch.id,
        type: StorageType.STORE,
        category: StorageCategory.IN_BRANCH,
        isDefault: true,
        isActive: true,
      });
      await storageRepo.save(seedSalaVenta);
      console.log(
        `✅ Almacén ejemplo creado: «${SEED_STORAGE_SALA_NAME}» id=${seedSalaVenta.id} branchId=${seedBranch.id}`,
      );
    } else {
      if (seedSalaVenta.deletedAt) {
        seedSalaVenta = await storageRepo.recover(seedSalaVenta);
      }
      seedSalaVenta.companyId = company.id;
      seedSalaVenta.name = SEED_STORAGE_SALA_NAME;
      seedSalaVenta.branchId = seedBranch.id;
      seedSalaVenta.type = StorageType.STORE;
      seedSalaVenta.category = StorageCategory.IN_BRANCH;
      seedSalaVenta.isDefault = true;
      seedSalaVenta.isActive = true;
      await storageRepo.save(seedSalaVenta);
      console.log(
        `✅ Almacén «${SEED_STORAGE_SALA_NAME}» ya existía: id=${seedSalaVenta.id} (sincronizado con seed)`,
      );
    }

    const legacyDeposito = await storageRepo.findOne({
      where: { companyId: company.id, code: SEED_REMOVED_STORAGE_CODE },
      withDeleted: true,
    });
    if (legacyDeposito && !legacyDeposito.deletedAt) {
      if (legacyDeposito.isDefault) {
        legacyDeposito.isDefault = false;
        await storageRepo.save(legacyDeposito);
      }
      await storageRepo.softRemove(legacyDeposito);
      console.log('🗑️  Almacén seed eliminado: «Depósito principal»');
    }

    // Único almacén activo de la empresa seed: Sala de venta (predeterminado).
    await storageRepo.update({ companyId: company.id }, { isDefault: false });
    await storageRepo.update({ id: seedSalaVenta.id }, { isDefault: true, isActive: true });

    const stockLevelRepoForStorage = dataSource.getRepository(StockLevel);
    await stockLevelRepoForStorage.delete({
      companyId: company.id,
      storageId: Not(seedSalaVenta.id),
    });

    const extraStorages = await storageRepo.find({
      where: { companyId: company.id, deletedAt: IsNull() },
    });
    let removedStorageCount = 0;
    for (const st of extraStorages) {
      if (st.id === seedSalaVenta.id) {
        continue;
      }
      await storageRepo.softRemove(st);
      removedStorageCount += 1;
    }
    if (removedStorageCount > 0) {
      console.log(
        `🗑️  Almacenes extra retirados: ${removedStorageCount} (predeterminado: «${SEED_STORAGE_SALA_NAME}»)`,
      );
    }

    // Units: UNIDAD (predeterminada) + volumen (ml, L). Sin docena / gramo / kilogramo en seed.
    const setCompanyDefaultUnit = async (defaultUnitId: string): Promise<void> => {
      await unitRepo.update(
        { companyId: company.id, deletedAt: null as never },
        { isDefault: false },
      );
      await unitRepo.update(
        { id: defaultUnitId, companyId: company.id },
        { isDefault: true },
      );
    };

    let baseUnit = await unitRepo.findOne({
      where: { symbol: SEED_UNIT_BASE_SYMBOL, companyId: company.id, deletedAt: null as never },
    });
    if (!baseUnit) {
      baseUnit = unitRepo.create({
        name: SEED_UNIT_BASE_NAME,
        symbol: SEED_UNIT_BASE_SYMBOL,
        dimension: UnitDimension.COUNT,
        conversionFactor: 1,
        allowDecimals: false,
        isBase: true,
        baseUnitId: null,
        active: true,
        isDefault: true,
      });
      await unitRepo.save(baseUnit);
      await setCompanyDefaultUnit(baseUnit.id);
      console.log(`✅ Unidad ejemplo creada: ${baseUnit.symbol} (${baseUnit.name}) id=${baseUnit.id}`);
    } else {
      baseUnit.name = SEED_UNIT_BASE_NAME;
      baseUnit.dimension = UnitDimension.COUNT;
      baseUnit.conversionFactor = 1;
      baseUnit.allowDecimals = false;
      baseUnit.isBase = true;
      baseUnit.baseUnitId = null;
      baseUnit.active = true;
      baseUnit.isDefault = true;
      await unitRepo.save(baseUnit);
      await setCompanyDefaultUnit(baseUnit.id);
      console.log(`✅ Unidad ejemplo ${baseUnit.symbol} ya existía: id=${baseUnit.id} (sincronizada con seed)`);
    }

    for (const sym of SEED_REMOVED_UNIT_SYMBOLS) {
      const legacy = await unitRepo.findOne({
        where: { symbol: sym, companyId: company.id },
        withDeleted: true,
      });
      if (legacy && !legacy.deletedAt) {
        if (legacy.isDefault) {
          legacy.isDefault = false;
          await unitRepo.save(legacy);
        }
        await unitRepo.softRemove(legacy);
        console.log(`🗑️  Unidad seed eliminada: «${sym}»`);
      }
    }
    await setCompanyDefaultUnit(baseUnit.id);

    /** Símbolos de unidad seed (empresa actual) para variantes y product.baseUnitId */
    type SeedUnitKey = 'UN' | 'ML' | 'L';

    const upsertSeedUnit = async (args: {
      symbol: string;
      name: string;
      dimension: UnitDimension;
      isBase: boolean;
      conversionFactor: number;
      baseUnitId: string | null;
      allowDecimals: boolean;
      active?: boolean;
    }): Promise<Unit> => {
      let u = await unitRepo.findOne({
        where: { symbol: args.symbol, companyId: company.id },
        withDeleted: true,
      });
      const isDefaultUnit =
        args.symbol.toLowerCase() === SEED_UNIT_BASE_SYMBOL.toLowerCase();
      if (!u) {
        u = unitRepo.create({
          symbol: args.symbol,
          name: args.name,
          dimension: args.dimension,
          isBase: args.isBase,
          conversionFactor: args.conversionFactor,
          baseUnitId: args.baseUnitId,
          allowDecimals: args.allowDecimals,
          active: args.active ?? true,
          isDefault: isDefaultUnit,
        });
        await unitRepo.save(u);
        if (isDefaultUnit) {
          await setCompanyDefaultUnit(u.id);
        }
        console.log(`✅ Unidad seed creada: ${args.symbol} (${args.name}) id=${u.id}`);
      } else {
        if (u.deletedAt) {
          u = await unitRepo.recover(u);
        }
        u.name = args.name;
        u.dimension = args.dimension;
        u.isBase = args.isBase;
        u.conversionFactor = args.conversionFactor;
        u.baseUnitId = args.baseUnitId;
        u.allowDecimals = args.allowDecimals;
        u.active = args.active ?? true;
        u.isDefault = isDefaultUnit;
        await unitRepo.save(u);
        if (isDefaultUnit) {
          await setCompanyDefaultUnit(u.id);
        }
        console.log(`✅ Unidad seed ${args.symbol} ya existía: id=${u.id} (sincronizada)`);
      }
      return u;
    };

    const unitMl = await upsertSeedUnit({
      symbol: 'ml',
      name: 'Mililitro',
      dimension: UnitDimension.VOLUME,
      isBase: true,
      conversionFactor: 1,
      baseUnitId: null,
      allowDecimals: true,
    });
    const unitLiter = await upsertSeedUnit({
      symbol: 'L',
      name: 'Litro',
      dimension: UnitDimension.VOLUME,
      isBase: false,
      conversionFactor: 1000,
      baseUnitId: unitMl.id,
      allowDecimals: true,
    });

    const seedUnitId: Record<SeedUnitKey, string> = {
      UN: baseUnit.id,
      ML: unitMl.id,
      L: unitLiter.id,
    };

    // Categorías de producto (vidrios / accesorios)
    for (const legacyName of LEGACY_SEED_CATEGORY_NAMES) {
      const legacy = await categoryRepo.findOne({ where: { name: legacyName } });
      if (legacy) {
        await categoryRepo.softRemove(legacy);
        console.log(`🗑️  Categoría legacy eliminada: «${legacyName}»`);
      }
    }

    const categoryByName = new Map<string, Category>();
    for (let i = 0; i < SEED_PRODUCT_CATEGORIES.length; i++) {
      const name = SEED_PRODUCT_CATEGORIES[i];
      const existing = await categoryRepo.findOne({ where: { name } });
      const saved = existing
        ? await categoryRepo.save({
            ...existing,
            name,
            description: undefined,
            parentId: undefined,
            sortOrder: i,
            isActive: true,
            resultCenterId: null,
          })
        : await categoryRepo.save(
            categoryRepo.create({
              name,
              description: undefined,
              parentId: undefined,
              sortOrder: i,
              isActive: true,
              resultCenterId: null,
            }),
          );
      categoryByName.set(name, saved);
      console.log(
        `✅ Categoría ${saved.name} ${existing ? 'sincronizada' : 'creada'}: id=${saved.id}`,
      );
    }

    const catAccesorios = categoryByName.get('Accesorios');
    if (!catAccesorios) {
      throw new Error('Seed minimal: categoría Accesorios no sincronizada');
    }

    // Atributo único: AÑO (opciones desde anos-unicos.json)
    for (const legacyName of LEGACY_SEED_ATTRIBUTE_NAMES) {
      const legacy = await attributeRepo.findOne({ where: { name: legacyName } });
      if (legacy) {
        await attributeRepo.softRemove(legacy);
        console.log(`🗑️  Atributo legacy eliminado: «${legacyName}»`);
      }
    }

    const seedAttributeDefs = buildSeedAttributes();
    let atributoAno: Attribute | undefined;
    for (const def of seedAttributeDefs) {
      const existingAttr = await attributeRepo.findOne({
        where: { name: def.name },
      });
      const saved = existingAttr
        ? await attributeRepo.save({
            ...existingAttr,
            description: undefined,
            options: [...def.options],
            displayOrder: def.displayOrder,
            isActive: true,
          })
        : await attributeRepo.save(
            attributeRepo.create({
              name: def.name,
              description: undefined,
              options: [...def.options],
              displayOrder: def.displayOrder,
              isActive: true,
            }),
          );
      if (def.name === SEED_ANO_ATTRIBUTE_NAME) {
        atributoAno = saved;
      }
      console.log(
        `✅ Atributo ${saved.name} (${saved.options.length} opciones) ${existingAttr ? 'sincronizado' : 'creado'}: id=${saved.id}`,
      );
    }
    if (!atributoAno) {
      throw new Error('Seed minimal: atributo AÑO no sincronizado');
    }

    // Lista de precios única (UNICA, default). Listas legacy se desactivan.
    for (const legacyName of ['MINORISTA', 'MAYORISTA'] as const) {
      const legacy = await priceListRepo.findOne({ where: { name: legacyName } });
      if (legacy) {
        await priceListRepo.save({
          ...legacy,
          isDefault: false,
          isActive: false,
        });
        console.log(`✅ Lista legacy «${legacyName}» desactivada: id=${legacy.id}`);
      }
    }

    const existingUnica = await priceListRepo.findOne({
      where: { name: SEED_PRICE_LIST_NAME },
    });
    const unica = existingUnica
      ? await priceListRepo.save({
          ...existingUnica,
          priceListType: PriceListType.RETAIL,
          currency: 'CLP',
          validFrom: undefined,
          validUntil: undefined,
          priority: 0,
          isDefault: true,
          isActive: true,
          description: undefined,
        })
      : await priceListRepo.save(
          priceListRepo.create({
            name: SEED_PRICE_LIST_NAME,
            priceListType: PriceListType.RETAIL,
            currency: 'CLP',
            validFrom: undefined,
            validUntil: undefined,
            priority: 0,
            isDefault: true,
            isActive: true,
            description: undefined,
          }),
        );
    console.log(
      `✅ Lista de precios ${unica.name} ${existingUnica ? 'ya existía' : 'creada'}: id=${unica.id} (default)`,
    );

    // ---------------------------------------------------------------------
    // Productos demo (catálogo): físico varias presentaciones, multivariante tallas, servicio, digital, insumo BOM
    // ---------------------------------------------------------------------
    const productRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const brandRepo = dataSource.getRepository(Brand);

    type SeedVariantUom = {
      stock: SeedUnitKey;
      sale: SeedUnitKey;
      purchase: SeedUnitKey;
    };

    type SeedVariantShipping = {
      netWeightKg: number;
      grossWeightKg: number;
      packageLengthCm: number;
      packageWidthCm: number;
      packageHeightCm: number;
      /** Divisor K en (L×W×H cm³)/K → kg volumétrico; por defecto 5000 en payload. */
      volumetricDivisorK?: number;
    };

    type SeedVariantSeed = {
      sku: string;
      barcode?: string;
      basePrice: number;
      baseCost: number;
      trackInventory: boolean;
      allowNegativeStock?: boolean;
      attributeValues?: Record<string, string>;
      retailNet: number;
      wholesaleNet: number;
      /** Si se omite: venta/stock/compra en UNIDAD (UN). */
      uom?: SeedVariantUom;
      /** Datos de empaque/peso para cotización de flete (variantes físicas). */
      shipping?: SeedVariantShipping;
    };

    type SeedProductSeed = {
      name: string;
      brand?: string;
      description?: string;
      productType: ProductType;
      categoryId: string;
      /** Unidad de referencia del producto en catálogo (columna `base_unit_id`). Por defecto UN. */
      productBaseUnit?: SeedUnitKey;
      variants: SeedVariantSeed[];
    };

    const seedDemoProducts: SeedProductSeed[] = [
      {
        name: 'Café de grano',
        brand: 'Origen Sur',
        description:
          'Físico con tres presentaciones (250 g, 500 g, 1 kg); inventario rastreado.',
        productType: ProductType.PHYSICAL,
        categoryId: catAccesorios.id,
        productBaseUnit: 'UN',
        variants: [
          {
            sku: 'SEED-DEMO-CAFE-250',
            barcode: '7800001002501',
            basePrice: 2790,
            baseCost: 1200,
            trackInventory: true,
            retailNet: 2790,
            wholesaleNet: 2350,
            uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
            shipping: {
              netWeightKg: 0.25,
              grossWeightKg: 0.31,
              packageLengthCm: 14,
              packageWidthCm: 9,
              packageHeightCm: 6,
              volumetricDivisorK: 5000,
            },
          },
          {
            sku: 'SEED-DEMO-CAFE-500',
            barcode: '7800001005001',
            basePrice: 4990,
            baseCost: 2200,
            trackInventory: true,
            retailNet: 4990,
            wholesaleNet: 4200,
            uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
            shipping: {
              netWeightKg: 0.5,
              grossWeightKg: 0.58,
              packageLengthCm: 16,
              packageWidthCm: 10,
              packageHeightCm: 9,
              volumetricDivisorK: 5000,
            },
          },
          {
            sku: 'SEED-DEMO-CAFE-1KG',
            barcode: '7800001010001',
            basePrice: 8990,
            baseCost: 4000,
            trackInventory: true,
            retailNet: 8990,
            wholesaleNet: 7600,
            uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
            shipping: {
              netWeightKg: 1,
              grossWeightKg: 1.12,
              packageLengthCm: 22,
              packageWidthCm: 12,
              packageHeightCm: 11,
              volumetricDivisorK: 5000,
            },
          },
        ],
      },
      {
        name: 'Polera algodón estampada',
        brand: 'Demo Wear',
        description: 'Producto demo físico (variante única).',
        productType: ProductType.PHYSICAL,
        categoryId: catAccesorios.id,
        variants: [
          {
            sku: 'SEED-DEMO-POL-ML',
            barcode: '7800002001001',
            basePrice: 12990,
            baseCost: 6000,
            trackInventory: true,
            retailNet: 12990,
            wholesaleNet: 11000,
            shipping: {
              netWeightKg: 0.16,
              grossWeightKg: 0.21,
              packageLengthCm: 32,
              packageWidthCm: 24,
              packageHeightCm: 3,
              volumetricDivisorK: 5000,
            },
          },
        ],
      },
      {
        name: 'Servicio armado de pedido en tienda',
        brand: 'Demo Servicios',
        description:
          'Servicio (tipo SERVICE): variante única; consumos por receta/BOM al completar órdenes de servicio.',
        productType: ProductType.SERVICE,
        categoryId: catAccesorios.id,
        variants: [
          {
            sku: 'SEED-DEMO-SRV-ARM',
            basePrice: 3500,
            baseCost: 0,
            trackInventory: false,
            allowNegativeStock: false,
            retailNet: 3500,
            wholesaleNet: 3000,
          },
        ],
      },
      {
        name: 'Pack plantillas hoja de cálculo (digital)',
        brand: 'Demo Digital',
        description:
          'Digital: sin stock físico; útil para ventas documentadas y flujos sin inventario.',
        productType: ProductType.DIGITAL,
        categoryId: catAccesorios.id,
        variants: [
          {
            sku: 'SEED-DEMO-DIG-XLS',
            basePrice: 15000,
            baseCost: 0,
            trackInventory: false,
            retailNet: 15000,
            wholesaleNet: 12000,
          },
        ],
      },
      {
        name: 'Harina integral saco 25 kg',
        brand: 'Molino Demo',
        description:
          'Materia prima / insumo físico (25 kg y 5 kg) para recepciones y líneas de receta (BOM) hacia servicios o producción.',
        productType: ProductType.PHYSICAL,
        categoryId: catAccesorios.id,
        productBaseUnit: 'UN',
        variants: [
          {
            sku: 'SEED-DEMO-MP-HAR25',
            barcode: '7800003002501',
            basePrice: 18990,
            baseCost: 12000,
            trackInventory: true,
            retailNet: 18990,
            wholesaleNet: 16500,
            uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
            shipping: {
              netWeightKg: 25,
              grossWeightKg: 25.5,
              packageLengthCm: 65,
              packageWidthCm: 42,
              packageHeightCm: 18,
              volumetricDivisorK: 5000,
            },
          },
          {
            sku: 'SEED-DEMO-MP-HAR5',
            barcode: '7800003005001',
            basePrice: 45990,
            baseCost: 28000,
            trackInventory: true,
            retailNet: 45990,
            wholesaleNet: 39900,
            uom: { stock: 'UN', sale: 'UN', purchase: 'UN' },
            shipping: {
              netWeightKg: 5,
              grossWeightKg: 5.15,
              packageLengthCm: 38,
              packageWidthCm: 26,
              packageHeightCm: 14,
              volumetricDivisorK: 5000,
            },
          },
        ],
      },
      {
        name: 'Aceite de oliva extra virgen',
        brand: 'Origen Mediterráneo',
        description:
          'Físico por volumen (500 mL y 1 L); stock en mililitros; compra típica en litros.',
        productType: ProductType.PHYSICAL,
        categoryId: catAccesorios.id,
        productBaseUnit: 'ML',
        variants: [
          {
            sku: 'SEED-DEMO-ACE-500',
            barcode: '7800004005002',
            basePrice: 5990,
            baseCost: 3200,
            trackInventory: true,
            retailNet: 5990,
            wholesaleNet: 5100,
            uom: { stock: 'ML', sale: 'ML', purchase: 'L' },
            shipping: {
              netWeightKg: 0.48,
              grossWeightKg: 0.65,
              packageLengthCm: 7,
              packageWidthCm: 7,
              packageHeightCm: 22,
              volumetricDivisorK: 5000,
            },
          },
          {
            sku: 'SEED-DEMO-ACE-1L',
            barcode: '7800004010002',
            basePrice: 9990,
            baseCost: 5200,
            trackInventory: true,
            retailNet: 9990,
            wholesaleNet: 8500,
            uom: { stock: 'ML', sale: 'L', purchase: 'L' },
            shipping: {
              netWeightKg: 0.92,
              grossWeightKg: 1.08,
              packageLengthCm: 8,
              packageWidthCm: 8,
              packageHeightCm: 29,
              volumetricDivisorK: 5000,
            },
          },
        ],
      },
    ];

    const marcasAutos = loadSeedMarcasAutos();
    const demoProductBrandNames = seedDemoProducts
      .map((d) => d.brand?.trim())
      .filter((x): x is string => Boolean(x && x.length > 0));
    const seedBrandNames = [
      ...new Set([...marcasAutos, ...demoProductBrandNames]),
    ].sort((a, b) => a.localeCompare(b, 'es'));

    const brandIdByName = new Map<string, string>();
    for (const nm of seedBrandNames) {
      let b = await brandRepo.findOne({
        where: { companyId: company.id, name: nm },
      });
      if (!b) {
        b = brandRepo.create({
          companyId: company.id,
          name: nm,
          description: marcasAutos.includes(nm)
            ? 'Marca de vehículo (catálogo seed)'
            : null,
          isActive: true,
        });
        b = await brandRepo.save(b);
        console.log(
          `✅ Marca ${marcasAutos.includes(nm) ? 'auto' : 'demo'} creada: «${nm}» id=${b.id}`,
        );
      } else {
        if (marcasAutos.includes(nm) && !b.description) {
          b.description = 'Marca de vehículo (catálogo seed)';
          await brandRepo.save(b);
        }
        console.log(`✅ Marca ya existía: «${nm}» id=${b.id}`);
      }
      brandIdByName.set(nm, b.id);
    }
    console.log(
      `✅ Marcas de auto sincronizadas: ${marcasAutos.length} (total marcas seed: ${seedBrandNames.length})`,
    );

    const upsertPriceListItem = async (args: {
      priceListId: string;
      productId: string;
      productVariantId: string;
      net: number;
      taxId: string;
    }) => {
      const gross = Math.round(args.net * 1.19);
      let row = await priceListItemRepo.findOne({
        where: {
          priceListId: args.priceListId,
          productId: args.productId,
          productVariantId: args.productVariantId,
        },
      });
      if (!row) {
        row = priceListItemRepo.create({
          priceListId: args.priceListId,
          productId: args.productId,
          productVariantId: args.productVariantId,
          netPrice: args.net,
          grossPrice: gross,
          taxIds: [args.taxId],
        });
      } else {
        row.netPrice = args.net;
        row.grossPrice = gross;
        row.taxIds = [args.taxId];
      }
      await priceListItemRepo.save(row);
    };

    for (const def of seedDemoProducts) {
      let product = await productRepo.findOne({
        where: { name: def.name },
      });
      const productPayload = {
        name: def.name,
        brand: def.brand,
        brandId: def.brand?.trim() ? brandIdByName.get(def.brand.trim()) ?? null : null,
        description: def.description,
        productType: def.productType,
        categoryId: def.categoryId,
        taxIds: [ivaTax.id],
        isActive: true,
        baseUnitId: seedUnitId[def.productBaseUnit ?? 'UN'],
      };
      if (!product) {
        product = productRepo.create(productPayload);
      } else {
        Object.assign(product, productPayload);
      }
      product = await productRepo.save(product);

      for (const vd of def.variants) {
        let variant: ProductVariant | null = await variantRepo.findOne({
          where: { sku: vd.sku },
        });
        const triplet = vd.uom ?? { stock: 'UN', sale: 'UN', purchase: 'UN' };
        const saleId = seedUnitId[triplet.sale];
        const stockId = seedUnitId[triplet.stock];
        const purchaseId = seedUnitId[triplet.purchase];

        const variantPayload: DeepPartial<ProductVariant> = {
          productId: product.id,
          sku: vd.sku,
          barcode: vd.barcode,
          basePrice: vd.basePrice,
          baseCost: vd.baseCost,
          pmp: null,
          pmpHistory: null,
          unitId: saleId,
          stockBaseUnitId: stockId,
          saleUnitId: saleId,
          purchaseUnitId: purchaseId,
          attributeValues: vd.attributeValues ?? undefined,
          taxIds: [ivaTax.id],
          trackInventory: vd.trackInventory,
          allowNegativeStock: vd.allowNegativeStock ?? false,
          isActive: true,
          minimumStock: 0,
          maximumStock: 0,
          reorderPoint: 0,
        };

        if (vd.shipping) {
          const k = vd.shipping.volumetricDivisorK ?? 5000;
          variantPayload.netWeightKg = vd.shipping.netWeightKg;
          variantPayload.grossWeightKg = vd.shipping.grossWeightKg;
          variantPayload.packageLengthCm = vd.shipping.packageLengthCm;
          variantPayload.packageWidthCm = vd.shipping.packageWidthCm;
          variantPayload.packageHeightCm = vd.shipping.packageHeightCm;
          variantPayload.volumetricDivisorK = k;
        }

        if (!variant) {
          variant = variantRepo.create(variantPayload);
        } else {
          Object.assign(variant, variantPayload);
        }

        const savedVariant = await variantRepo.save(variant);

        await upsertPriceListItem({
          priceListId: unica.id,
          productId: product.id,
          productVariantId: savedVariant.id,
          net: vd.retailNet,
          taxId: ivaTax.id,
        });
      }

      console.log(
        `✅ Producto demo sincronizado: «${def.name}» (${def.productType}) variantes=${def.variants.length} productId=${product.id}`,
      );
    }

    // ---------------------------------------------------------------------
    // Catálogo Excel (catalogo-productos-seed.json): 1 producto / 1 variante por fila
    // ---------------------------------------------------------------------
    const catalogoRows = loadSeedCatalogoProductos();
    const preciosSalaStockMaps = loadPreciosSalaVentaStockMaps();
    const catalogStockByVariantId = new Map<string, number>();
    const unitUnId = seedUnitId.UN;
    let catalogVariantCreated = 0;
    let catalogVariantUpdated = 0;
    let catalogStockFromExcel = 0;

    console.log(
      `📦 Catálogo Excel: sincronizando ${catalogoRows.length} productos (precio venta con IVA → neto ÷ ${1 + SEED_CATALOGO_IVA_TASA})…`,
    );

    for (const row of catalogoRows) {
      const category = categoryByName.get(row.categoria);
      if (!category) {
        throw new Error(
          `Seed catálogo: categoría «${row.categoria}» no existe (producto «${row.nombre}»)`,
        );
      }

      const precioVentaConIva = Math.max(0, Number(row.precioVentaConIva) || 0);
      const retailNet =
        precioVentaConIva > 0
          ? Math.round(precioVentaConIva / (1 + SEED_CATALOGO_IVA_TASA))
          : 0;
      const wholesaleNet = retailNet;
      const baseCost = Math.max(0, Number(row.precioNeto) || 0);

      const attributeValues =
        row.anio && atributoAno.id
          ? { [atributoAno.id]: row.anio }
          : undefined;

      let variant = await variantRepo.findOne({
        where: { sku: row.sku, companyId: company.id },
      });

      let product: Product | null = null;
      if (variant?.productId) {
        product = await productRepo.findOne({ where: { id: variant.productId } });
      }

      const productPayload = {
        name: row.nombre,
        brand: undefined,
        brandId: null,
        description: row.codigo
          ? `Código referencia: ${row.codigo}`
          : 'Catálogo importado (seed Excel)',
        productType: ProductType.PHYSICAL,
        categoryId: category.id,
        taxIds: [ivaTax.id],
        isActive: true,
        baseUnitId: unitUnId,
      };

      if (!product) {
        product = productRepo.create(productPayload);
      } else {
        Object.assign(product, productPayload);
      }
      product = await productRepo.save(product);

      const variantPayload: DeepPartial<ProductVariant> = {
        productId: product.id,
        sku: row.sku,
        basePrice: retailNet,
        baseCost,
        pmp: null,
        pmpHistory: null,
        unitId: unitUnId,
        stockBaseUnitId: unitUnId,
        saleUnitId: unitUnId,
        purchaseUnitId: unitUnId,
        attributeValues,
        taxIds: [ivaTax.id],
        trackInventory: true,
        allowNegativeStock: false,
        isActive: true,
        minimumStock: 0,
        maximumStock: 0,
        reorderPoint: 0,
      };

      if (!variant) {
        variant = variantRepo.create(variantPayload);
        catalogVariantCreated += 1;
      } else {
        Object.assign(variant, variantPayload);
        catalogVariantUpdated += 1;
      }

      const savedVariant = await variantRepo.save(variant);

      await upsertPriceListItem({
        priceListId: unica.id,
        productId: product.id,
        productVariantId: savedVariant.id,
        net: retailNet,
        taxId: ivaTax.id,
      });

      const physicalQty = resolvePreciosSalaStockQty(row, preciosSalaStockMaps);
      catalogStockByVariantId.set(savedVariant.id, physicalQty);
      if (physicalQty > 0) {
        catalogStockFromExcel += 1;
      }
    }

    console.log(
      `✅ Catálogo Excel sincronizado: ${catalogoRows.length} productos (variantes nuevas=${catalogVariantCreated}, actualizadas=${catalogVariantUpdated}, con stock N°>0=${catalogStockFromExcel})`,
    );

    await variantRepo.update(
      { companyId: company.id },
      { pmp: null, pmpHistory: null },
    );
    console.log('✅ PMP e historial en null para todas las variantes de la empresa seed');

    // Point of sale (ejemplo): CAJA LOCAL en sucursal seed con listas de precios
    const priceListsJson = [{ id: unica.id, name: unica.name, isActive: true }];
    const existingPos = await posRepo.findOne({
      where: { name: SEED_POS_NAME },
    });
    const caja = existingPos
      ? await posRepo.save({
          ...existingPos,
          branchId: seedBranch.id,
          storageId: seedSalaVenta.id,
          isActive: true,
          deviceId: undefined,
          defaultPriceListId: unica.id,
          priceLists: priceListsJson,
        })
      : await posRepo.save(
          posRepo.create({
            name: SEED_POS_NAME,
            branchId: seedBranch.id,
            storageId: seedSalaVenta.id,
            isActive: true,
            deviceId: undefined,
            defaultPriceListId: unica.id,
            priceLists: priceListsJson,
          }),
        );
    console.log(
      `✅ Punto de venta ${caja.name} ${existingPos ? 'ya existía' : 'creado'}: id=${caja.id}`,
    );

    const stockLevelRepo = dataSource.getRepository(StockLevel);
    const trackedVariants = await variantRepo.find({
      where: { companyId: company.id, trackInventory: true, deletedAt: null as never },
      select: ['id'],
    });
    let catalogStockLevelsWritten = 0;
    for (const v of trackedVariants) {
      const physicalQty = catalogStockByVariantId.get(v.id) ?? 0;
      if (catalogStockByVariantId.has(v.id)) {
        catalogStockLevelsWritten += 1;
      }
      let sl = await stockLevelRepo.findOne({
        where: { productVariantId: v.id, storageId: seedSalaVenta.id },
      });
      if (!sl) {
        sl = stockLevelRepo.create({
          companyId: company.id,
          productVariantId: v.id,
          storageId: seedSalaVenta.id,
          physicalStock: physicalQty,
          committedStock: 0,
          availableStock: physicalQty,
          incomingStock: 0,
        });
      } else {
        sl.physicalStock = physicalQty;
        sl.committedStock = 0;
        sl.availableStock = physicalQty;
        sl.incomingStock = 0;
      }
      await stockLevelRepo.save(sl);
    }
    console.log(
      `✅ Stock «${SEED_STORAGE_SALA_NAME}»: ${catalogStockLevelsWritten} variante(s) del catálogo Excel (columna N°), ${trackedVariants.length - catalogStockLevelsWritten} demo/otras en 0`,
    );

    /** Medios de pago POS (CAJA LOCAL): sincronizados con catálogo empresa en cada seed. */
    {
      const reloadedCompany = await companyRepo.findOne({
        where: { id: company.id },
      });
      const companyCatalog =
        reloadedCompany?.settings &&
        typeof reloadedCompany.settings === 'object' &&
        Array.isArray((reloadedCompany.settings as any).paymentMethods)
          ? ((reloadedCompany.settings as any).paymentMethods as Array<any>)
          : seedCompanyPaymentCatalog;

      const existingPosSettings =
        (caja.settings && typeof caja.settings === 'object'
          ? (caja.settings as Record<string, any>)
          : {}) ?? {};
      const posList = buildSeedPosPaymentList(companyCatalog);
      caja.settings = {
        ...existingPosSettings,
        paymentMethods: posList,
      };
      await posRepo.save(caja);
      console.log(
        `✅ Medios de pago POS «${caja.name}» sincronizados (${posList.length}): CASH precargado y vuelto por defecto`,
      );
    }

    // Centro de acopio demo: vinculado a sucursal seed y al POS «CAJA LOCAL».
    let seedCashHub = await cashHubRepo.findOne({
      where: { companyId: company.id, code: SEED_CASH_HUB_CODE },
    });
    if (!seedCashHub) {
      seedCashHub = cashHubRepo.create({
        companyId: company.id,
        name: SEED_CASH_HUB_NAME,
        code: SEED_CASH_HUB_CODE,
        isActive: true,
      });
      await cashHubRepo.save(seedCashHub);
    } else if (seedCashHub.name !== SEED_CASH_HUB_NAME) {
      seedCashHub.name = SEED_CASH_HUB_NAME;
      await cashHubRepo.save(seedCashHub);
    }
    const seedBranchRow = await branchRepo.findOne({ where: { id: seedBranch.id } });
    if (seedBranchRow) {
      seedCashHub.branches = [seedBranchRow];
    }
    seedCashHub.pointsOfSale = [caja];
    await cashHubRepo.save(seedCashHub);
    caja.defaultCashHubId = seedCashHub.id;
    await posRepo.save(caja);
    console.log(
      `✅ Centro de acopio «${seedCashHub.name}» sincronizado: id=${seedCashHub.id} (POS=${caja.id})`,
    );

    // Expense categories (seed explícito): limpiar y recrear catálogo por empresa.
    const deleteResult = await expenseCategoryRepo
      .createQueryBuilder()
      .delete()
      .from(ExpenseCategory)
      .where('companyId = :companyId', { companyId: company.id })
      .execute();
    console.log(
      `✅ Categorías de gasto eliminadas para companyId=${company.id}: ${deleteResult.affected ?? 0}`,
    );

    for (const item of SEED_EXPENSE_CATEGORIES) {
      const row = expenseCategoryRepo.create({
        companyId: company.id,
        code: null,
        name: item.name,
        operationalExpenseGroup: item.operationalExpenseGroup,
        description: item.name,
        requiresApproval: false,
        approvalThreshold: '0',
        defaultResultCenterId: null,
        isActive: true,
        examples: null,
        metadata: null,
      });
      await expenseCategoryRepo.save(row);
      console.log(
        `✅ Categoría de gasto creada: ${row.name} (${row.operationalExpenseGroup}) id=${row.id}`,
      );
    }

    // Suppliers (ejemplos): 10 combinaciones entre persona/empresa y campos opcionales.
    for (const item of SEED_SUPPLIERS) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: item.person.type,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          businessName: item.person.businessName,
          documentType: item.person.documentType,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
        });
      } else {
        person.type = item.person.type;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.businessName = item.person.businessName;
        person.documentType = item.person.documentType;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
      }
      person = await personRepo.save(person);

      let supplier = await supplierRepo.findOne({
        where: { personId: person.id },
        withDeleted: true,
      });
      if (!supplier) {
        supplier = supplierRepo.create({
          personId: person.id,
          supplierType: item.supplier.supplierType,
          alias: item.supplier.alias,
          defaultPaymentTermDays: item.supplier.defaultPaymentTermDays,
          isActive: item.supplier.isActive,
          notes: item.supplier.notes,
        });
      } else {
        if (supplier.deletedAt) {
          supplier = await supplierRepo.recover(supplier);
        }
        supplier.personId = person.id;
        supplier.supplierType = item.supplier.supplierType;
        supplier.alias = item.supplier.alias;
        supplier.defaultPaymentTermDays = item.supplier.defaultPaymentTermDays;
        supplier.isActive = item.supplier.isActive;
        supplier.notes = item.supplier.notes;
      }
      supplier = await supplierRepo.save(supplier);
      console.log(
        `✅ Proveedor ${supplier.alias ?? person.businessName ?? `${person.firstName} ${person.lastName ?? ''}`.trim()} sincronizado: id=${supplier.id} tipo=${supplier.supplierType}`,
      );
    }

    // Customers (ejemplos): combinaciones de persona/empresa, distintos
    // límites de crédito y días de pago. Cada customer queda vinculado a
    // un `Person` (FK) y a la `Company` seed vía `companyId` (NOT NULL).
    for (const item of SEED_CUSTOMERS) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: item.person.type,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          businessName: item.person.businessName,
          documentType: item.person.documentType,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
        });
      } else {
        person.type = item.person.type;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.businessName = item.person.businessName;
        person.documentType = item.person.documentType;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
      }
      person = await personRepo.save(person);

      let customer = await customerRepo.findOne({
        where: { companyId: company.id, personId: person.id },
        withDeleted: true,
      });
      if (!customer) {
        customer = customerRepo.create({
          companyId: company.id,
          personId: person.id,
          creditLimit: item.customer.creditLimit,
          currentBalance: 0,
          paymentDayOfMonth: item.customer.paymentDayOfMonth,
          isActive: item.customer.isActive,
          notes: item.customer.notes,
        });
      } else {
        if (customer.deletedAt) {
          customer = await customerRepo.recover(customer);
        }
        customer.companyId = company.id;
        customer.personId = person.id;
        customer.creditLimit = item.customer.creditLimit;
        customer.paymentDayOfMonth = item.customer.paymentDayOfMonth;
        customer.isActive = item.customer.isActive;
        customer.notes = item.customer.notes;
      }
      customer = await customerRepo.save(customer);
      const displayName =
        person.businessName ??
        `${person.firstName} ${person.lastName ?? ''}`.trim();
      console.log(
        `✅ Cliente «${displayName}» sincronizado: id=${customer.id} companyId=${customer.companyId} crédito=${customer.creditLimit} día=${customer.paymentDayOfMonth} activo=${customer.isActive}`,
      );
    }

    const seedShareholders = [
      {
        firstName: 'Walter',
        lastName: 'Parada Vargas',
        documentType: DocumentType.RUN,
        documentNumber: '11.566.882-K',
        ownershipPercentage: 100,
        partnerType: 'FOUNDING_PARTNER',
        joinDate: '2020-01-15',
      },
    ] as const;

    let seedShareholderPersonId: string | null = null;

    for (const sh of seedShareholders) {
      let person = await personRepo.findOne({
        where: { documentNumber: sh.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: PersonType.NATURAL,
          firstName: sh.firstName,
          lastName: sh.lastName,
          documentType: sh.documentType,
          documentNumber: sh.documentNumber,
        });
      } else {
        person.firstName = sh.firstName;
        person.lastName = sh.lastName;
        person.documentType = sh.documentType;
      }
      person = await personRepo.save(person);
      seedShareholderPersonId = person.id;

      let shRow = await shareholderRepo.findOne({
        where: { companyId: company.id, personId: person.id, deletedAt: null as never },
      });
      if (!shRow) {
        shRow = shareholderRepo.create({
          companyId: company.id,
          personId: person.id,
          ownershipPercentage: sh.ownershipPercentage,
          partnerType: sh.partnerType,
          joinDate: sh.joinDate,
          isActive: true,
        });
      } else {
        shRow.ownershipPercentage = sh.ownershipPercentage;
        shRow.partnerType = sh.partnerType;
        shRow.joinDate = sh.joinDate;
        shRow.isActive = true;
      }
      await shareholderRepo.save(shRow);
      console.log(
        `✅ Socio seed: ${sh.firstName} ${sh.lastName} participación=${sh.ownershipPercentage}% partnerType=${sh.partnerType}`,
      );
    }

    if (seedShareholderPersonId) {
      const otherShareholders = await shareholderRepo.find({
        where: { companyId: company.id, deletedAt: null as never },
      });
      for (const row of otherShareholders) {
        if (row.personId !== seedShareholderPersonId) {
          await shareholderRepo.softRemove(row);
          console.log(`🗑️ Socio fuera de seed retirado: shareholderId=${row.id}`);
        }
      }
    }

    // Helper idempotente: asegura un usuario seed con su persona asociada.
    // Si existe, actualiza rol/companyId/nonDeletable/email para que el
    // estado seed siempre coincida con el modelo declarado.
    const ensureSeedUser = async (params: {
      userName: string;
      password: string;
      rol: UserRole;
      companyId: string | null;
      nonDeletable: boolean;
      firstName: string;
      lastName: string;
      email: string;
      documentNumber: string;
    }) => {
      let u = await userRepo.findOne({
        where: { userName: params.userName, deletedAt: null as never },
        relations: ['person'],
      });

      if (!u) {
        const personEntity = personRepo.create({
          type: PersonType.NATURAL,
          firstName: params.firstName,
          lastName: params.lastName,
          documentType: DocumentType.RUT,
          documentNumber: params.documentNumber,
          email: params.email,
        });
        const savedPerson = await personRepo.save(personEntity);

        u = userRepo.create({
          userName: params.userName,
          pass: await bcrypt.hash(params.password, 12),
          mail: params.email,
          rol: params.rol,
          companyId: params.companyId,
          nonDeletable: params.nonDeletable,
          person: savedPerson,
        });
        await userRepo.save(u);

        console.log(
          `✅ Usuario seed creado: rol=${params.rol} userName='${params.userName}' password='${params.password}'`,
        );
        return;
      }

      const needsBcrypt = !u.pass?.startsWith('$2');
      if (needsBcrypt) {
        u.pass = await bcrypt.hash(params.password, 12);
      }
      u.mail = params.email;
      u.rol = params.rol;
      u.companyId = params.companyId;
      u.nonDeletable = params.nonDeletable;

      if (!u.person) {
        const personEntity = personRepo.create({
          type: PersonType.NATURAL,
          firstName: params.firstName,
          lastName: params.lastName,
          documentType: DocumentType.RUT,
          documentNumber: params.documentNumber,
          email: params.email,
        });
        u.person = await personRepo.save(personEntity);
      } else {
        u.person.firstName = params.firstName;
        u.person.lastName = params.lastName;
        u.person.documentNumber = params.documentNumber;
        u.person.email = params.email;
        await personRepo.save(u.person);
      }

      await userRepo.save(u);

      console.log(
        `✅ Usuario seed actualizado: rol=${params.rol} userName='${params.userName}' password='${params.password}'`,
      );
    };

    const seedPassword = password;

    await ensureSeedUser({
      userName: 'superadmin',
      password: seedPassword,
      rol: UserRole.SUPER_ADMIN,
      companyId: null,
      nonDeletable: true,
      firstName: 'Administrador',
      lastName: 'de Sistema',
      email: 'superadmin@kai.local',
      documentNumber: '11111111-1',
    });

    await ensureSeedUser({
      userName: userName, // 'admin' por defecto, configurable via SEED_ADMIN_USERNAME
      password: seedPassword,
      rol: UserRole.ADMIN,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Administrador',
      lastName: 'de empresa',
      email,
      documentNumber: '22222222-2',
    });

    await ensureSeedUser({
      userName: 'operador',
      password: seedPassword,
      rol: UserRole.OPERATOR,
      companyId: company.id,
      nonDeletable: false,
      firstName: 'Operador',
      lastName: 'POS',
      email: 'operador@kai.local',
      documentNumber: '33333333-3',
    });

    console.log('✅ Seed mínimo OK. Tres usuarios listos:');
    console.log(`   • superadmin / ${seedPassword}   (SUPER_ADMIN, protegido)`);
    console.log(`   • ${userName} / ${seedPassword}        (ADMIN de la empresa)`);
    console.log(`   • operador / ${seedPassword}    (OPERATOR de la empresa)`);
      },
    );
  } catch (error) {
    console.error('❌ Error ejecutando seed mínimo:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
