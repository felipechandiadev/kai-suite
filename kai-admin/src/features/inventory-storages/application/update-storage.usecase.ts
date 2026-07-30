import { UpdateStorageFormSchema } from "../domain/storage.entity";
import { StorageRequest } from "../infrastructure/storage.request";
import type { UpdateStorageResult } from "../types/storage.types";

export class UpdateStorageUseCase {
  static async execute(input: unknown): Promise<UpdateStorageResult> {
    const parsed = UpdateStorageFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return StorageRequest.update(d.id, {
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
