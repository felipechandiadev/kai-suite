import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { printCashSessionOpening } from "@/features/cash-session-opening/lib/cash-session-opening-print";
import { consumePendingCashSessionOpeningPrint } from "@/features/cash-session-opening/lib/pending-cash-session-opening-print";

/**
 * Imprime el comprobante de apertura encolado al abrir sesión.
 * Se ejecuta en el POS (no en session-setup) para no revalidar esa ruta ni frenar la navegación.
 */
export function runPendingCashSessionOpeningPrintIfAny(): void {
  const pending = consumePendingCashSessionOpeningPrint();
  if (!pending) return;

  void (async () => {
    let company = null;
    try {
      company = (await getCompanyDetailsAction()) ?? null;
    } catch {
      company = null;
    }
    printCashSessionOpening({ ...pending, company });
  })();
}
