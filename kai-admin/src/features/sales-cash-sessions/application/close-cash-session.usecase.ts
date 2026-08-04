import { CloseCashSessionRequest } from "../infrastructure/close-cash-session.request";
import type { CloseCashSessionResult } from "../types/close-cash-session.types";

export class CloseCashSessionUseCase {
  static async execute(input: {
    sessionId: string;
    notes?: string;
  }): Promise<CloseCashSessionResult> {
    return CloseCashSessionRequest.adminClose(input);
  }
}
