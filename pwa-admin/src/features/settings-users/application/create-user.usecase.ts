import { CreateUserFormSchema } from "../domain/user.entity";
import { UserRequest } from "../infrastructure/user.request";
import type { CreateUserResult } from "../types/user.types";

export class CreateUserUseCase {
  static async execute(input: unknown): Promise<CreateUserResult> {
    const parsed = CreateUserFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return UserRequest.create({
      userName: d.userName,
      mail: d.mail,
      password: d.password,
      rol: d.rol,
      personId: d.personId,
      person: d.person
        ? {
            type: "NATURAL",
            firstName: d.person.firstName,
            lastName: d.person.lastName,
            documentType: d.person.documentType,
            documentNumber: d.person.documentNumber,
            email: d.person.email || undefined,
            phone: d.person.phone,
          }
        : undefined,
      alsoAsEmployee: d.alsoAsEmployee
        ? {
            branchId: d.alsoAsEmployee.branchId || undefined,
            employmentType: d.alsoAsEmployee.employmentType,
            hireDate: d.alsoAsEmployee.hireDate,
            baseSalary: d.alsoAsEmployee.baseSalary || undefined,
          }
        : undefined,
    });
  }
}
