import { UserRequest } from "../infrastructure/user.request";
import type { ListUsersResult } from "../types/user.types";

export class ListUsersUseCase {
  static async execute(): Promise<ListUsersResult> {
    return UserRequest.findAll();
  }
}
