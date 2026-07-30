import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { SaleLineBuckets } from "./types";
import { lineRequiresDte } from "./types";

export function classifySaleLines(lines: PosCartLine[]): SaleLineBuckets {
  const dteLines: PosCartLine[] = [];
  const nonDteLines: PosCartLine[] = [];
  for (const line of lines) {
    if (lineRequiresDte(line)) {
      dteLines.push(line);
    } else {
      nonDteLines.push(line);
    }
  }
  return { dteLines, nonDteLines };
}
