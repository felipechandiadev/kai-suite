import type { Repository } from 'typeorm';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { ExpenseCategoryOperationalGroup } from '@modules/expense-categories/domain/expense-category-operational-group.enum';
import { ExpenseCategoryPnlNature } from '@modules/expense-categories/domain/expense-category-pnl-nature.enum';

export type SeedExpenseCategoryDef = {
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroup;
  pnlNature: ExpenseCategoryPnlNature;
  nonDeletable?: boolean;
};

/** Catálogo demo / Barco de categorías de gasto operativo (incluye Créditos). */
export const SEED_EXPENSE_CATEGORIES: readonly SeedExpenseCategoryDef[] = [
  {
    name: 'Sueldos',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
    nonDeletable: true,
  },
  {
    name: 'Horas extra',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
    nonDeletable: true,
  },
  {
    name: 'Cargas sociales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
    nonDeletable: true,
  },
  {
    name: 'Capacitación operativa',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Arriendo',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Gastos comunes',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Mantención',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Limpieza',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Seguridad física',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Electricidad',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Agua',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Embalaje',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Útiles',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Materiales no inventariables',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'EPP (Elementos de Protección Personal)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Flete',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Courier',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Combustible operativo',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Peajes',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Almacenaje externo',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Software recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Hosting',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Internet y telecomunicaciones',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'POS (Puntos de Venta)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Soporte',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Licencias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Promociones en tienda',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Señalética',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Muestras',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Contabilidad/tributario recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Retainer legal',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Auditorías',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Comisiones bancarias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    pnlNature: ExpenseCategoryPnlNature.SALES,
  },
  {
    name: 'Seguros operativos',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Costos de líneas de crédito',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Cuotas de crédito',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.CREDITOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Mermas autorizadas',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Diferencias de caja menores',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Obsolescencia (gasto operativo)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Permisos municipales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Fiscalización',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
  {
    name: 'Certificaciones obligatorias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
    pnlNature: ExpenseCategoryPnlNature.ADMIN,
  },
];

/** Limpia y recrea el catálogo de categorías de gasto para una empresa. */
export async function seedExpenseCategoriesForCompany(params: {
  expenseCategoryRepo: Repository<ExpenseCategory>;
  companyId: string;
  logLabel?: string;
}): Promise<void> {
  const { expenseCategoryRepo, companyId, logLabel } = params;
  const label = logLabel ?? companyId;

  const deleteResult = await expenseCategoryRepo
    .createQueryBuilder()
    .delete()
    .from(ExpenseCategory)
    .where('companyId = :companyId', { companyId })
    .execute();
  console.log(
    `✅ Categorías de gasto eliminadas (${label}): ${deleteResult.affected ?? 0}`,
  );

  for (const item of SEED_EXPENSE_CATEGORIES) {
    const row = expenseCategoryRepo.create({
      companyId,
      code: null,
      name: item.name,
      operationalExpenseGroup: item.operationalExpenseGroup,
      pnlNature: item.pnlNature,
      description: item.name,
      requiresApproval: false,
      approvalThreshold: '0',
      defaultResultCenterId: null,
      isActive: true,
      nonDeletable: item.nonDeletable === true,
      examples: null,
      metadata: null,
    });
    await expenseCategoryRepo.save(row);
  }
  console.log(
    `✅ Categorías de gasto sembradas (${label}): ${SEED_EXPENSE_CATEGORIES.length}`,
  );
}
