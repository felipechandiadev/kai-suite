import { UserRequest } from "../infrastructure/user.request";
import type { DeleteUserResult } from "../types/user.types";

export class DeleteUserUseCase {
  static async execute(id: string): Promise<DeleteUserResult> {
    const trimmed = String(id ?? "").trim();
    if (!trimmed) {
      return { success: false, error: "Identificador no válido" };
    }
    return UserRequest.remove(trimmed);
  }
}
