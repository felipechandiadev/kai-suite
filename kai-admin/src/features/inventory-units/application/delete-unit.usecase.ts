import { UnitRequest } from "../infrastructure/unit.request";
import type { DeleteUnitResult } from "../types/unit.types";

export class DeleteUnitUseCase {
  static async execute(id: string): Promise<DeleteUnitResult> {
    return UnitRequest.remove(id);
  }
}
