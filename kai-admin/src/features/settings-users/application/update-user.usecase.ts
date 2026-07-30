import { UpdateUserFormSchema } from "../domain/user.entity";
import { UserRequest } from "../infrastructure/user.request";
import {
  primaryLegacyRoleFromMembershipRoles,
  type UpdateUserResult,
} from "../types/user.types";

export class UpdateUserUseCase {
  static async execute(input: unknown): Promise<UpdateUserResult> {
    const parsed = UpdateUserFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    const primaryRoles = d.memberships[0]?.roles ?? [];
    const rol =
      d.rol ??
      (primaryLegacyRoleFromMembershipRoles(primaryRoles) as
        | "ADMIN"
        | "POS_OPERATOR"
        | "COURIER"
        | "SUB_ADMIN"
        | "WAITER"
        | "STOCK_OPERATOR"
        | "KDS_OPERATOR");
    return UserRequest.update(d.id, {
      userName: d.userName,
      mail: d.mail,
      rol,
      memberships: d.memberships,
      personName: d.personName ?? null,
      phone: d.phone ?? null,
      personDni: d.personDni ?? null,
      personId: d.personId ?? null,
    });
  }
}
