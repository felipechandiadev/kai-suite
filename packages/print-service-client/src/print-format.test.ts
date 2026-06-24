import { describe, expect, it } from "vitest";
import {
  describePrintFormat,
  formatsMatchProfile,
  migrateLegacyPrintMode,
  parsePrintFormat,
  printFormatToPurpose,
  printFormatToPaperProfile,
  resolvePrintFormat,
} from "./print-format";
import { getPrintFormatPreset } from "./print-format-presets";

describe("print-format", () => {
  it("migrates legacy modes", () => {
    expect(migrateLegacyPrintMode("ticket")).toBe("ticket_80mm");
    expect(migrateLegacyPrintMode("document")).toBe("document_a4");
  });

  it("parses legacy and new values", () => {
    expect(parsePrintFormat("ticket")).toBe("ticket_80mm");
    expect(parsePrintFormat("ticket_58mm")).toBe("ticket_58mm");
    expect(parsePrintFormat("document_letter")).toBe("document_letter");
    expect(parsePrintFormat("invalid")).toBeNull();
  });

  it("maps format to purpose", () => {
    expect(printFormatToPurpose("ticket_58mm")).toBe("tickets");
    expect(printFormatToPurpose("document_a4")).toBe("documents");
  });

  it("maps format to paper profile", () => {
    expect(printFormatToPaperProfile("ticket_80mm")).toBe("80mm");
    expect(printFormatToPaperProfile("document_letter")).toBe("letter");
  });

  it("validates profile match", () => {
    expect(formatsMatchProfile("ticket_58mm", "58mm")).toBe(true);
    expect(formatsMatchProfile("ticket_80mm", "58mm")).toBe(false);
  });

  it("resolvePrintFormat falls back sensibly", () => {
    expect(resolvePrintFormat(null, "document")).toBe("document_a4");
    expect(resolvePrintFormat("ticket_58mm")).toBe("ticket_58mm");
  });

  it("describePrintFormat returns human labels", () => {
    expect(describePrintFormat("document_letter")).toContain("carta");
  });
});

describe("print-format-presets", () => {
  it("has 32 chars for 58mm and 48 for 80mm", () => {
    expect(getPrintFormatPreset("ticket_58mm").charsPerLine).toBe(32);
    expect(getPrintFormatPreset("ticket_80mm").charsPerLine).toBe(48);
  });
});
