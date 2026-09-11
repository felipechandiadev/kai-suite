"use client";

import { useState } from "react";
import { Button } from "@kai/ui";
import { exportAssistantReportAction } from "../actions/assistant.action";
import { downloadBase64File } from "../lib/sami-download";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";

export function ExportFileButtons({
  reportId,
  filenameHint,
}: {
  reportId: string;
  filenameHint?: string;
}) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const onExport = async (format: "xlsx" | "pdf") => {
    setBusy(format);
    try {
      const res = await exportAssistantReportAction(reportId, format);
      if (!res.success) {
        handleUnauthorizedClient(res);
        return;
      }
      downloadBase64File(
        res.fileBase64,
        res.filename || filenameHint || `sami.${format}`,
        res.contentType,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy !== null}
        onClick={() => void onExport("xlsx")}
      >
        {busy === "xlsx" ? "Generando…" : "Descargar Excel"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy !== null}
        onClick={() => void onExport("pdf")}
      >
        {busy === "pdf" ? "Generando…" : "Descargar PDF"}
      </Button>
    </div>
  );
}
