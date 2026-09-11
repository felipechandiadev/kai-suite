import type { AssistantBlock } from '../domain/assistant-block.types';
import { formatSamiCellDate } from './sami-date-format';

type ReportLike = {
  title?: string;
  summary?: Record<string, number | string>;
  series?: Array<{
    id: string;
    label: string;
    chart?: string;
    points: Array<{ x: string; y: number; y2?: number }>;
  }>;
  columns?: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
  rows?: Record<string, unknown>[];
  footnotes?: string[];
};

function formatClp(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function reportResultToBlocks(result: ReportLike): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  const summary = result.summary ?? {};
  const kpiItems = Object.entries(summary)
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value:
        typeof value === 'number' && Math.abs(value) >= 100
          ? formatClp(value)
          : value,
    }));
  if (kpiItems.length) {
    blocks.push({ type: 'kpi', items: kpiItems });
  }
  const series = result.series ?? [];
  for (const s of series.slice(0, 2)) {
    if (!s.points?.length) continue;
    const chart =
      s.chart === 'line' || s.chart === 'area' || s.chart === 'pie'
        ? s.chart
        : 'bar';
    blocks.push({
      type: 'chart',
      chart,
      title: s.label || result.title,
      series: [
        {
          id: s.id,
          label: s.label,
          points: s.points.map((p) => ({
            x: String(formatSamiCellDate(p.x) ?? p.x),
            y: Number(p.y) || 0,
          })),
        },
      ],
    });
  }
  if ((result.columns?.length ?? 0) > 0 && (result.rows?.length ?? 0) > 0) {
    blocks.push({
      type: 'table',
      title: result.title,
      columns: result.columns ?? [],
      rows: (result.rows ?? []).slice(0, 80).map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          out[k] = formatSamiCellDate(v);
        }
        return out;
      }),
    });
  }
  if (result.footnotes?.length) {
    blocks.push({
      type: 'markdown',
      content: result.footnotes.map((f) => `- ${f}`).join('\n'),
    });
  }
  return blocks;
}
