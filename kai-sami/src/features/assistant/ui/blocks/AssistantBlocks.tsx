"use client";

import type { AssistantBlock } from "../../domain/assistant-block.types";
import { sanitizeMarkdown } from "../../lib/sanitize-markdown";
import { ChartBlock } from "./ChartBlock";
import { ExportFileButtons } from "../ExportFileButtons";

export function AssistantBlocks({ blocks }: { blocks: AssistantBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => (
        <BlockView key={`${block.type}-${i}`} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: AssistantBlock }) {
  if (block.type === "markdown") {
    return (
      <div
        className="prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(block.content) }}
      />
    );
  }
  if (block.type === "kpi") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {block.items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          >
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="text-lg font-semibold">{String(item.value)}</div>
            {item.hint ? (
              <div className="text-xs text-muted-foreground">{item.hint}</div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        {block.title ? (
          <div className="border-b border-border px-3 py-2 text-sm font-medium">
            {block.title}
          </div>
        ) : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              {block.columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-t border-border">
                {block.columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {formatCell(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "chart") {
    return <ChartBlock block={block} />;
  }
  if (block.type === "query_echo") {
    return (
      <details className="rounded-lg border border-border px-3 py-2 text-xs">
        <summary className="cursor-pointer font-medium">Consulta interpretada</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
          {JSON.stringify(block.query, null, 2)}
        </pre>
      </details>
    );
  }
  if (block.type === "report") {
    return (
      <a
        href={`/reports/${block.reportId}`}
        className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
      >
        Ver informe: {block.title}
      </a>
    );
  }
  if (block.type === "download") {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
        <span className="text-sm">
          {block.format === "xlsx" ? "Excel" : "PDF"}: {block.filename}
        </span>
        <ExportFileButtons reportId={block.reportId} filenameHint={block.filename} />
      </div>
    );
  }
  return null;
}

function formatCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    return new Intl.NumberFormat("es-CL").format(v);
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(v);
  }
  if (typeof v === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return String(v);
}
