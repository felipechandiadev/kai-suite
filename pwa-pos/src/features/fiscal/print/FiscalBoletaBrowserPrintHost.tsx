"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";
import {
  buildFiscalBoletaReceiptInnerHtml,
  getFiscalBoletaPrintCss,
} from "./build-fiscal-boleta-preview-html";
import {
  registerFiscalBoletaBrowserPrintHost,
  type FiscalBoletaBrowserPrintJob,
} from "./fiscal-boleta-browser-print-portal";
import { fiscalTimbrePdf417SvgForPreview } from "./fiscal-timbre-pdf417";
import { FISCAL_BOLETA_BROWSER_PDF_FORMAT } from "./print-fiscal-boleta-browser-pdf";

const FISCAL_BOLETA_PRINT_PAGE_STYLE = `
  @page { size: A4; margin: 14mm; }
  @media print {
    html, body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

function FiscalBoletaPrintSurface({
  preview,
  pdf417Svg,
}: {
  preview: FiscalBoletaPrintPreview;
  pdf417Svg: string;
}) {
  const css = getFiscalBoletaPrintCss(FISCAL_BOLETA_BROWSER_PDF_FORMAT);
  const receiptHtml = buildFiscalBoletaReceiptInnerHtml(preview, pdf417Svg);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="receipt" dangerouslySetInnerHTML={{ __html: receiptHtml }} />
    </>
  );
}

export function FiscalBoletaBrowserPrintHost() {
  const [job, setJob] = useState<FiscalBoletaBrowserPrintJob | null>(null);
  const [pdf417Svg, setPdf417Svg] = useState("");
  const [renderReady, setRenderReady] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const jobRef = useRef<FiscalBoletaBrowserPrintJob | null>(null);
  const printFnRef = useRef<(() => void | Promise<void>) | null>(null);
  jobRef.current = job;

  const reactToPrintFn = useReactToPrint({
    contentRef,
    documentTitle: () => `Boleta SII ${jobRef.current?.preview.folio ?? ""}`,
    ignoreGlobalStyles: true,
    pageStyle: FISCAL_BOLETA_PRINT_PAGE_STYLE,
    onBeforePrint: () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      }),
    onAfterPrint: () => {
      jobRef.current?.resolve();
      setJob(null);
      setPdf417Svg("");
      setRenderReady(false);
    },
    onPrintError: (_location, error) => {
      jobRef.current?.reject(error);
      setJob(null);
      setPdf417Svg("");
      setRenderReady(false);
    },
  });

  printFnRef.current = reactToPrintFn;

  const enqueue = useCallback((next: FiscalBoletaBrowserPrintJob) => {
    setRenderReady(false);
    setPdf417Svg("");
    setJob(next);
  }, []);

  useEffect(() => {
    registerFiscalBoletaBrowserPrintHost(enqueue);
    return () => registerFiscalBoletaBrowserPrintHost(null);
  }, [enqueue]);

  useEffect(() => {
    if (!job) return;

    let cancelled = false;

    void (async () => {
      const svg = await fiscalTimbrePdf417SvgForPreview(job.preview, FISCAL_BOLETA_BROWSER_PDF_FORMAT);
      if (cancelled) return;

      if (!svg.trim()) {
        console.warn(
          "[KaiStore fiscal boleta] PDF417 vacío antes de imprimir; folio",
          job.preview.folio,
        );
      }

      setPdf417Svg(svg);
      setRenderReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [job]);

  useEffect(() => {
    if (!job || !renderReady) return;

    const timer = window.setTimeout(() => {
      const print = printFnRef.current;
      if (!print) {
        job.reject(new Error("fiscal_boleta_print_fn_unavailable"));
        setJob(null);
        setPdf417Svg("");
        setRenderReady(false);
        return;
      }
      if (!contentRef.current) {
        job.reject(new Error("fiscal_boleta_print_content_empty"));
        setJob(null);
        setPdf417Svg("");
        setRenderReady(false);
        return;
      }
      void Promise.resolve(print())
        .then(() => {
          /* onAfterPrint / onPrintError resuelven el job */
        })
        .catch((error) => {
          job.reject(error);
          setJob(null);
          setPdf417Svg("");
          setRenderReady(false);
        });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [job, renderReady, pdf417Svg]);

  if (!job || !renderReady) return null;

  return (
    <div
      aria-hidden
      data-test-id="fiscal-boleta-browser-print-host"
      style={{
        position: "fixed",
        width: 0,
        height: 0,
        overflow: "hidden",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
        border: 0,
        padding: 0,
        margin: 0,
      }}
    >
      <div ref={contentRef} style={{ width: "210mm" }}>
        <FiscalBoletaPrintSurface preview={job.preview} pdf417Svg={pdf417Svg} />
      </div>
    </div>
  );
}
