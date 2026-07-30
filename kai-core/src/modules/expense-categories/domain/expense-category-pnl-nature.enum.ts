/**
 * Clasificación P&L del gasto operativo (catálogo cerrado).
 * Distingue Gastos de ventas vs Gastos de administración en el estado de resultados.
 */
export enum ExpenseCategoryPnlNature {
  SALES = 'SALES',
  ADMIN = 'ADMIN',
}

export type ExpenseCategoryPnlNatureMeta = {
  value: ExpenseCategoryPnlNature;
  label: string;
  description: string;
};

export const EXPENSE_CATEGORY_PNL_NATURE_META: readonly ExpenseCategoryPnlNatureMeta[] =
  [
    {
      value: ExpenseCategoryPnlNature.SALES,
      label: 'Gastos de ventas',
      description:
        'Egresos para concretar o entregar la venta (comisiones de pasarela, marketing, envíos al cliente, POS en punto de venta, etc.).',
    },
    {
      value: ExpenseCategoryPnlNature.ADMIN,
      label: 'Gastos de administración',
      description:
        'Egresos para mantener la empresa funcionando aunque no haya ventas (arriendo, servicios, software, contabilidad, nómina admin, etc.).',
    },
  ] as const;

export function isExpenseCategoryPnlNature(
  v: string,
): v is ExpenseCategoryPnlNature {
  return (Object.values(ExpenseCategoryPnlNature) as string[]).includes(v);
}
