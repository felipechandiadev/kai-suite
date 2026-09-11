import { samiCivilDate } from './sami-clock';

export type SamiPlatformBranch = { id: string; name: string };

export function buildPlatformContextPrompt(input: {
  productMode: string;
  diningEnabled: boolean;
  branches: SamiPlatformBranch[];
  now?: Date;
}): string {
  const today = samiCivilDate(input.now);
  const [y, month] = today.split('-');
  const monthStart = `${y}-${month}-01`;
  const dining = input.diningEnabled
    ? `- Salón / mesas / comandas: run_dining_report (dining-salon-summary | dining-by-hour | dining-by-table | dining-period-compare).`
    : `- Salón / mesas: no aplica en este deploy (${input.productMode}).`;
  const branches =
    input.branches.length === 0
      ? '- (sin sucursales cargadas)'
      : input.branches
          .slice(0, 20)
          .map((b) => `- ${b.name} (${b.id})`)
          .join('\n');

  return `Plataforma Kai (vertical ${input.productMode}):
- Empresa → sucursales → POS (venta mostrador) y, en KaiFood, cuentas de salón.
- Inventario: bodegas y stock físico / valorización (no es una venta).
- Compras: documentos a proveedor (no ventas).
Glosario: montos netos en CLP; sucursal = branch; ticket POS ≠ cuenta de mesa.

Intent → herramienta:
- Ventas / facturación / ticket / “cuánto vendimos”: run_sales_report reportId=sales-by-period.
- Top productos: run_sales_report reportId=top-products.
- Ventas por categoría: run_sales_report reportId=sales-by-category.
- Medios de pago: run_sales_report reportId=sales-by-payment-method.
- Ventas por POS: run_sales_report reportId=sales-by-pos.
- Comparativo de periodos: run_sales_report reportId=sales-period-compare (compareWith).
- Detalle / devoluciones / notas de crédito / promociones / cotizaciones / backorders / caja: el reportId homónimo en run_sales_report.
- Cliente que más compra / ranking de clientes: run_semantic_query dataset=sales metrics=[net_sales] dimensions=[customer] (el backend ignora walk-in). NO digas que falta CRM.
- Buscar / listar fichas de clientes: search_customers.
- Historial de UN cliente (UUID): run_sales_report reportId=customer-purchases + customerId.
- Solo un día de semana (lunes, etc.): run_semantic_query con filtro weekday.
- Stock / alertas / valorización / bodega / movimientos / ajustes: run_inventory_report.
- Compras / proveedores / recepciones: run_purchasing_report.
- Listar sucursales: list_branches. Catálogo de reportes: list_report_catalog.
- RRHH / horas planificadas (solo ADMIN): run_hcm_report reportId=hours-planned-by-employee.
${dining}
- Excel / PDF / descargar / exportar: export_report format=xlsx|pdf (después de tener datos).
No hagas: emitir boleta, cambiar precios, void de cuenta, transferir stock.

Sucursales (usá el UUID en branchId si el usuario nombra una):
${branches}

Ejemplo run_semantic_query (ventas por categoría este mes; cambiá las fechas del Reloj):
{"query":{"version":1,"source":"semantic","dataset":"sales","metrics":["net_sales"],"dimensions":["category"],"filters":[{"field":"date","op":"between","value":["${monthStart}","${today}"]}]}}

Ejemplo top clientes este mes:
{"query":{"version":1,"source":"semantic","dataset":"sales","metrics":["net_sales"],"dimensions":["customer"],"filters":[{"field":"date","op":"between","value":["${monthStart}","${today}"]}],"orderBy":[{"field":"net_sales","direction":"desc"}],"limit":10}}`;
}
