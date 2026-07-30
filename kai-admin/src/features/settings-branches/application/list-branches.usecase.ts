import "server-only";
import { BranchRequest } from "../infrastructure/branch.request";
import type { ListBranchesResult } from "../types/branch.types";

export class ListBranchesUseCase {
  static async execute(): Promise<ListBranchesResult> {
    return BranchRequest.findAll(true);
  }
}
