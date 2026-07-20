import { CreateStorageFormSchema } from "../domain/storage.entity";
import { StorageRequest } from "../infrastructure/storage.request";
import type { CreateStorageResult } from "../types/storage.types";

export class CreateStorageUseCase {
  static async execute(input: unknown): Promise<CreateStorageResult> {
    const parsed = CreateStorageFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return StorageRequest.create({
      name: d.name.trim(),
      code: d.code,
      branchId: d.branchId,
      type: d.type,
      category: d.category,
      capacity: d.capacity,
      address: d.address,
      location: d.location,
      isDefault: d.isDefault,
      isActive: d.isActive,
      laborUnitIds: d.laborUnitIds,
    });
  }
}
