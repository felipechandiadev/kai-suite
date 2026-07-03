"use client";

import { useCallback, useEffect, useRef } from "react";
import { isDocumentPrintFormat, type PrintFormat } from "@kai/print-service-client";
import { thermalPreviewWidthCss } from "@/features/pos-print/lib/document-print-format";

type Props = {
  html: string | null;
  format: PrintFormat;
  title?: string;
  "data-test-id"?: string;
  loadingLabel?: string;
};

export function PosPrintDocumentPreview({
  html,
  format,
  title = "Vista previa del comprobante",
  "data-test-id": testId = "pos-print-document-preview",
  loadingLabel = "Preparando vista previa…",
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isDocument = isDocumentPrintFormat(format);

  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
      );
      if (h > 0) iframe.style.height = `${h}px`;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!html) return;
    const timers = [0, 80, 250, 600, 1200].map((ms) => window.setTimeout(resizeIframe, ms));
    return () => timers.forEach(clearTimeout);
  }, [html, resizeIframe]);

  return (
    <div
      className={`mx-auto w-full max-h-[min(62vh,580px)] overflow-y-auto overflow-x-auto rounded-lg border border-border p-2 ${
        isDocument ? "max-w-[min(100%,720px)]" : "max-w-[min(100%,420px)]"
      }`}
      data-test-id={`${testId}-wrap`}
    >
      {html ? (
        <iframe
          ref={iframeRef}
          title={title}
          srcDoc={html}
          onLoad={resizeIframe}
          className={`mx-auto block border-0 bg-white ${isDocument ? "w-full max-w-[210mm]" : "max-w-full"}`}
          style={
            isDocument
              ? { minHeight: "80px", width: "100%" }
              : { width: thermalPreviewWidthCss(format), minHeight: "80px" }
          }
          data-test-id={`${testId}-iframe`}
        />
      ) : (
        <p className="p-4 text-center text-sm text-muted-foreground">{loadingLabel}</p>
      )}
    </div>
  );
}
