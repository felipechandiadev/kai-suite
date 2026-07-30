import { BranchRequest } from "../infrastructure/branch.request";
import type { DeleteBranchResult } from "../types/branch.types";

export class DeleteBranchUseCase {
  static async execute(id: string): Promise<DeleteBranchResult> {
    if (!id?.trim()) {
      return { success: false, error: "Identificador no válido" };
    }
    return BranchRequest.remove(id.trim());
  }
}
