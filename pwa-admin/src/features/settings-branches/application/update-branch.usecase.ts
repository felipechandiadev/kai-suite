import { UpdateBranchFormSchema } from "../domain/branch.entity";
import { BranchRequest } from "../infrastructure/branch.request";
import type { UpdateBranchResult } from "../types/branch.types";

export class UpdateBranchUseCase {
  static async execute(input: unknown): Promise<UpdateBranchResult> {
    const parsed = UpdateBranchFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return BranchRequest.update(d.id, {
      name: d.name.trim(),
      address: d.address?.trim() ? d.address.trim() : null,
      phone: d.phone?.trim() ? d.phone.trim() : null,
      location:
        d.location && typeof d.location.lat === "number" && typeof d.location.lng === "number"
          ? d.location
          : null,
      isActive: d.isActive !== false,
      isHeadquarters: Boolean(d.isHeadquarters),
      laborUnitIds: d.laborUnitIds,
    });
  }
}
