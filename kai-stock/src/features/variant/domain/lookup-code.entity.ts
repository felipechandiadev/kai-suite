import { z } from "zod";
import { scanModeSchema, type ScanMode } from "./scan-mode.entity";

export const lookupCodeInputSchema = z.object({
  code: z.string().trim().min(1, "Ingrese un código"),
  mode: scanModeSchema,
});

export type LookupCodeInput = z.infer<typeof lookupCodeInputSchema>;

export function normalizeLookupCode(code: string, mode: ScanMode): string {
  return mode === "sku" ? code.trim() : code.trim();
}
