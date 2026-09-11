import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { SamiQuery, SamiFilter } from '../domain/sami-query.types';
import { getDatasetCatalog } from '../domain/semantic-catalog';
import type { AssistantBlock } from '../domain/assistant-block.types';
import { reportResultToBlocks } from './report-to-blocks';
import { isWeekdayFilterField, normalizeWeekdayValue } from './sami-weekday';

const ALLOWED_VIEWS = new Set([
  'v_sami_sales_lines',
  'v_sami_stock_levels',
  'v_sami_purchase_lines',
  'v_sami_dining_orders',
]);

@Injectable()
export class SemanticQueryCompiler {
  constructor(private readonly dataSource: DataSource) {}

  async run(
    companyId: string,
    query: SamiQuery,
  ): Promise<{ blocks: AssistantBlock[]; rowCount: number; echo: SamiQuery }> {
    const catalog = getDatasetCatalog(query.dataset);
    if (!ALLOWED_VIEWS.has(catalog.view)) {
      throw new Error('Vista no permitida');
    }
    const metricDefs = query.metrics
      .map((id) => catalog.metrics.find((m) => m.id === id)!)
      .filter(Boolean);
    const dimDefs = (query.dimensions ?? [])
      .map((id) => catalog.dimensions.find((d) => d.id === id)!)
      .filter(Boolean);

    const selectParts: string[] = [];
    const params: unknown[] = [companyId];
    let p = 2;

    for (const d of dimDefs) {
      selectParts.push(`"${d.column}" AS "${d.id}"`);
    }
    for (const m of metricDefs) {
      const agg = m.aggregate === 'count' ? 'COUNT' : m.aggregate === 'avg' ? 'AVG' : 'SUM';
      const expr =
        m.aggregate === 'count'
          ? `COUNT(*)`
          : `${agg}("${m.column}")`;
      selectParts.push(`${expr} AS "${m.id}"`);
    }

    const where: string[] = [`company_id = $1`];
    for (const f of query.filters ?? []) {
      const clause = this.compileFilter(f, catalog.filters, params, () => p++);
      if (clause) where.push(clause);
    }
    if (shouldExcludeWalkInCustomers(query)) {
      where.push(`"customer_id" IS NOT NULL`);
    }

    const groupBy = dimDefs.map((d) => `"${d.column}"`).join(', ');
    const order = (query.orderBy ?? [])
      .map((o) => {
        const col =
          metricDefs.find((m) => m.id === o.field)?.id ??
          dimDefs.find((d) => d.id === o.field)?.id;
        if (!col) return null;
        const dir = o.direction === 'asc' ? 'ASC' : 'DESC';
        return `"${col}" ${dir}`;
      })
      .filter(Boolean)
      .join(', ');

    const limit = query.limit ?? 100;
    params.push(limit);
    const limitPh = `$${p}`;

    let sql = `SELECT ${selectParts.join(', ')} FROM ${catalog.view} WHERE ${where.join(' AND ')}`;
    if (groupBy) sql += ` GROUP BY ${groupBy}`;
    if (order) sql += ` ORDER BY ${order}`;
    sql += ` LIMIT ${limitPh}`;

    const rows = (await this.dataSource.query(sql, params)) as Record<
      string,
      unknown
    >[];

    const columns = [
      ...dimDefs.map((d) => ({ key: d.id, label: d.label })),
      ...metricDefs.map((m) => ({
        key: m.id,
        label: m.label,
        align: 'right' as const,
      })),
    ];
    const chartType = resolveChartType(query, dimDefs[0]?.id);
    const series =
      chartType && dimDefs[0] && metricDefs[0]
        ? [
            {
              id: metricDefs[0].id,
              label: metricDefs[0].label,
              chart: chartType,
              points: rows.map((r) => ({
                x: String(r[dimDefs[0].id] ?? ''),
                y: Number(r[metricDefs[0].id]) || 0,
              })),
            },
          ]
        : [];

    const blocks = reportResultToBlocks({
      title: query.chart?.title ?? catalog.dataset,
      series,
      columns,
      rows,
    });
    blocks.unshift({ type: 'query_echo', query: query as unknown as Record<string, unknown> });
    return { blocks, rowCount: rows.length, echo: query };
  }

  private compileFilter(
    filter: SamiFilter,
    allowed: Array<{ id: string; column: string; type: string }>,
    params: unknown[],
    next: () => number,
  ): string | null {
    let field = String(filter.field ?? '');
    if (field === 'dow') field = 'weekday';
    const def =
      allowed.find((a) => a.id === field) ??
      (field === 'dateFrom' || field === 'dateTo'
        ? allowed.find((a) => a.id === 'date')
        : undefined);
    if (!def) return null;
    const col = `"${def.column}"`;
    const op = filter.op;
    if (def.id === 'has_customer' || op === 'is_null' || op === 'not_null') {
      return compileNullness(col, op, filter.value, def.id === 'has_customer');
    }
    if (
      (op === 'eq' || op === 'neq') &&
      (filter.value === null || filter.value === undefined)
    ) {
      return op === 'eq' ? `${col} IS NULL` : `${col} IS NOT NULL`;
    }
    const mapVal = (v: unknown) =>
      isWeekdayFilterField(def.id) || isWeekdayFilterField(field)
        ? normalizeWeekdayValue(v)
        : v;
    if (op === 'between' && Array.isArray(filter.value) && filter.value.length === 2) {
      const a = next();
      const b = next();
      params.push(mapVal(filter.value[0]), mapVal(filter.value[1]));
      return `${col} BETWEEN $${a} AND $${b}`;
    }
    if (op === 'in' && Array.isArray(filter.value)) {
      const placeholders: string[] = [];
      for (const v of filter.value) {
        placeholders.push(`$${next()}`);
        params.push(mapVal(v));
      }
      if (!placeholders.length) return null;
      return `${col} IN (${placeholders.join(',')})`;
    }
    const ph = `$${next()}`;
    params.push(mapVal(filter.value));
    if (op === 'neq') return `${col} <> ${ph}`;
    if (op === 'gte') return `${col} >= ${ph}`;
    if (op === 'lte') return `${col} <= ${ph}`;
    if (op === 'contains') return `${col}::text ILIKE ${ph}`;
    return `${col} = ${ph}`;
  }
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === 'true' || value === '1';
}

function compileNullness(
  col: string,
  op: string,
  value: unknown,
  isHasCustomer: boolean,
): string {
  if (op === 'is_null') return `${col} IS NULL`;
  if (op === 'not_null') return `${col} IS NOT NULL`;
  if (isHasCustomer) {
    const wantIdentified = op === 'neq' ? !isTruthyFlag(value) : isTruthyFlag(value);
    return wantIdentified ? `${col} IS NOT NULL` : `${col} IS NULL`;
  }
  return `${col} IS NOT NULL`;
}

const CUSTOMER_SCOPE_FIELDS = new Set([
  'customer_id',
  'customer',
  'customer_name',
  'has_customer',
]);

function shouldExcludeWalkInCustomers(query: SamiQuery): boolean {
  if (!(query.dimensions ?? []).includes('customer')) return false;
  return !(query.filters ?? []).some((f) =>
    CUSTOMER_SCOPE_FIELDS.has(String(f.field ?? '')),
  );
}

function resolveChartType(
  query: SamiQuery,
  firstDimId: string | undefined,
): 'line' | 'bar' | 'pie' | 'area' | null {
  const hint = query.chart?.type;
  if (hint === 'line' || hint === 'bar' || hint === 'pie' || hint === 'area') {
    return hint;
  }
  if (hint === 'none') return null;
  if (firstDimId === 'day' || firstDimId === 'weekday') return 'bar';
  return null;
}
