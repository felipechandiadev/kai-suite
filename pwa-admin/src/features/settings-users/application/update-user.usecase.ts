import { UpdateUserFormSchema } from "../domain/user.entity";
import { UserRequest } from "../infrastructure/user.request";
import type { UpdateUserResult } from "../types/user.types";

export class UpdateUserUseCase {
  static async execute(input: unknown): Promise<UpdateUserResult> {
    const parsed = UpdateUserFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return UserRequest.update(d.id, {
      userName: d.userName,
      mail: d.mail,
      rol: d.rol,
      personName: d.personName ?? null,
      phone: d.phone ?? null,
      personDni: d.personDni ?? null,
      personId: d.personId ?? null,
    });
  }
}
