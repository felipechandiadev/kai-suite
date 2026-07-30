/** Impresión con el diálogo nativo del navegador (fallback). */
export function printHtmlInHiddenIframe(html: string, title: string): void {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    } finally {
      setTimeout(cleanup, 1200);
    }
  }, 120);
}
