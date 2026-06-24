import { describe, expect, it } from "vitest";
import {
  formatPrintJobFailedMessage,
  PRINT_SERVICE_DISCONNECTED_MESSAGE,
  printServiceNotificationsStorageKey,
} from "./print-notifications-storage";

describe("print-notifications-storage", () => {
  it("storage key is scoped by clientId", () => {
    expect(printServiceNotificationsStorageKey("pwa-pos")).toBe(
      "flowstore:print-service-notifications:pwa-pos",
    );
  });

  it("disconnect message is fixed", () => {
    expect(PRINT_SERVICE_DISCONNECTED_MESSAGE).toBe("KaiPrinters no está conectado.");
  });

  it("formats job failed message", () => {
    expect(formatPrintJobFailedMessage("sin impresora")).toBe("Error al imprimir: sin impresora");
  });

  it("humanizes known agent error codes", () => {
    expect(formatPrintJobFailedMessage("format_printer_mismatch")).toBe(
      "Error al imprimir: El formato del ticket no coincide con el ancho de papel de la impresora en Kai Printers.",
    );
  });
});
