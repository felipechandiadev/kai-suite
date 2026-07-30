import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";

export type FindMyOpenCashSessionResult =
  | {
      success: true;
      cashSessionId: string;
      pointOfSaleId: string;
      pointOfSaleName: string | null;
      branchName: string | null;
      openedByFullName: string | null;
    }
  | {
      success: true;
      cashSessionId: null;
      pointOfSaleId: null;
      pointOfSaleName: null;
      branchName: null;
      openedByFullName: null;
    }
  | { success: false; message: string };

export class FindMyOpenCashSessionUseCase {
  static async execute(): Promise<FindMyOpenCashSessionResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return { success: false, message: "No autenticado" };

    const list = await CashSessionsRequest.listOpen();
    if (!list?.success) {
      return { success: false, message: list?.message || "No se pudieron cargar sesiones de caja" };
    }

    const items = list.items ?? [];
    const mine = items.find((s) => s?.openedById === userId) ?? null;
    return mine
      ? {
          success: true,
          cashSessionId: mine.id,
          pointOfSaleId: mine.pointOfSaleId,
          pointOfSaleName: mine.pointOfSaleName ?? null,
          branchName: mine.branchName ?? null,
          openedByFullName: mine.openedByFullName ?? null,
        }
      : {
          success: true,
          cashSessionId: null,
          pointOfSaleId: null,
          pointOfSaleName: null,
          branchName: null,
          openedByFullName: null,
        };
  }
}

