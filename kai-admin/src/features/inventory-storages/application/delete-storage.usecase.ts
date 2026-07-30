import { StorageRequest } from "../infrastructure/storage.request";
import type { DeleteStorageResult } from "../types/storage.types";

export class DeleteStorageUseCase {
  static async execute(id: string): Promise<DeleteStorageResult> {
    return StorageRequest.remove(id);
  }
}
