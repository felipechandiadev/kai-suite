import { OpenCashSessionSchema, type OpenCashSessionInput } from "../domain/open-cash-session.entity";
import { CashSessionsRequest } from "../infrastructure/cash-sessions.request";

export type OpenCashSessionResult =
  | { success: true; cashSessionId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]>; statusCode?: number };

export class OpenCashSessionUseCase {
  static async execute(input: OpenCashSessionInput): Promise<OpenCashSessionResult> {
    const parsed = OpenCashSessionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors as any };
    }

    const res = await CashSessionsRequest.open({
      pointOfSaleId: parsed.data.pointOfSaleId,
      openingAmount: parsed.data.openingAmount,
      cashHubId: parsed.data.cashHubId,
    });

    if (!res.success) {
      return { success: false, error: res.message, statusCode: res.statusCode };
    }

    return { success: true, cashSessionId: res.cashSession.id };
  }
}

