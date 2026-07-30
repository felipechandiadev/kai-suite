import { UnitRequest } from "../infrastructure/unit.request";
import type { ListUnitsResult } from "../types/unit.types";

export class ListUnitsUseCase {
  static async execute(): Promise<ListUnitsResult> {
    return UnitRequest.findAll();
  }
}
