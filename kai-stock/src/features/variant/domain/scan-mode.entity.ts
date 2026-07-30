import { z } from "zod";

export const scanModeSchema = z.enum(["barcode", "sku"]);
export type ScanMode = z.infer<typeof scanModeSchema>;
