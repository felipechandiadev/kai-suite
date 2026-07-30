import { StorageRequest } from "../infrastructure/storage.request";
import type { ListStoragesResult } from "../types/storage.types";

export class ListStoragesUseCase {
  static async execute(): Promise<ListStoragesResult> {
    return StorageRequest.findAll(true);
  }
}
