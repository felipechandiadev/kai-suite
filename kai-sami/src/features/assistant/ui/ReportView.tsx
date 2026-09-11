"use client";

import { Button } from "@kai/ui";
import { AssistantBlocks } from "./blocks/AssistantBlocks";
import type { AssistantBlock } from "../domain/assistant-block.types";
import { ExportFileButtons } from "./ExportFileButtons";

export function ReportToolbar({
  title,
  reportId,
}: {
  title: string;
  reportId: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
      <a href="/chat" className="text-sm text-primary">
        ← Volver al chat
      </a>
      <div className="flex flex-wrap items-center gap-2">
        <ExportFileButtons reportId={reportId} />
        <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <h1 className="w-full text-lg font-semibold">{title}</h1>
    </div>
  );
}

export function ReportView({
  title,
  reportId,
  blocks,
}: {
  title: string;
  reportId: string;
  blocks: AssistantBlock[];
}) {
  return (
    <div className="space-y-4">
      <ReportToolbar title={title} reportId={reportId} />
      <AssistantBlocks blocks={blocks} />
    </div>
  );
}
