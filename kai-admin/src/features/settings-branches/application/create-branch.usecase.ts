import { CreateBranchFormSchema } from "../domain/branch.entity";
import { BranchRequest } from "../infrastructure/branch.request";
import { CompanyRequest } from "../infrastructure/company.request";
import type { CreateBranchResult } from "../types/branch.types";

export class CreateBranchUseCase {
  static async execute(input: unknown): Promise<CreateBranchResult> {
    const parsed = CreateBranchFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    const company = await CompanyRequest.getCurrent();
    return BranchRequest.create({
      name: d.name.trim(),
      address: d.address?.trim() ? d.address.trim() : null,
      phone: d.phone?.trim() ? d.phone.trim() : null,
      companyId: company?.id ?? null,
      location: d.location && typeof d.location.lat === "number" ? d.location : null,
      isActive: d.isActive !== false,
      laborUnitIds: d.laborUnitIds,
    });
  }
}
