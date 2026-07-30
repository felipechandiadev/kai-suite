import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const DOCUMENT_WIDTH_PX = 794;

async function waitForIframeLoad(iframe: HTMLIFrameElement, html: string): Promise<Document> {
  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("iframe_load_failed"));
    iframe.srcdoc = html;
  });
  return iframe.contentDocument!;
}

/** HTML de documento en hoja → PDF base64 para KaiPrinters (`type: pdf-base64`). */
export async function adminHtmlToPdfBase64(html: string): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("browser_only");
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "pdf-render");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    width: `${DOCUMENT_WIDTH_PX}px`,
    border: "none",
    visibility: "hidden",
  });
  document.body.appendChild(iframe);

  try {
    const doc = await waitForIframeLoad(iframe, html);
    if (!doc.body) throw new Error("iframe_body_missing");
    await new Promise((r) => globalThis.setTimeout(r, 180));

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: doc.body.scrollWidth,
      height: doc.body.scrollHeight,
      windowWidth: doc.body.scrollWidth,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    let pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height / canvas.width) * pageW;
    if (imgH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
    } else {
      const customH = Math.min(imgH, 400);
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageW, customH] });
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, customH);
    }

    const dataUri = pdf.output("datauristring");
    const comma = dataUri.indexOf(",");
    const base64 = comma >= 0 ? dataUri.slice(comma + 1) : "";
    if (!base64) throw new Error("pdf_base64_empty");
    return base64;
  } finally {
    iframe.remove();
  }
}
