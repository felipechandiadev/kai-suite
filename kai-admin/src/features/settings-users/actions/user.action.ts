"use server";

import { revalidatePath } from "next/cache";
import { ListUsersUseCase } from "../application/list-users.usecase";
import { CreateUserUseCase } from "../application/create-user.usecase";
import { UpdateUserUseCase } from "../application/update-user.usecase";
import { DeleteUserUseCase } from "../application/delete-user.usecase";
import type { CreateUserFormInput, UpdateUserFormInput } from "../domain/user.entity";
import type {
  CreateUserResult,
  DeleteUserResult,
  UpdateUserResult,
  UserListItem,
} from "../types/user.types";

const USERS_PATH = "/settings/users";

function revalidateUsersRoute() {
  revalidatePath(USERS_PATH, "page");
}

export async function listUsersForSettingsPage(): Promise<UserListItem[]> {
  const list = await ListUsersUseCase.execute();
  return list.success ? list.users : [];
}

export async function createUserAction(
  input: CreateUserFormInput,
): Promise<CreateUserResult> {
  const result = await CreateUserUseCase.execute(input);
  if (result.success) {
    revalidateUsersRoute();
  }
  return result;
}

export async function updateUserAction(
  input: UpdateUserFormInput,
): Promise<UpdateUserResult> {
  const result = await UpdateUserUseCase.execute(input);
  if (result.success) {
    revalidateUsersRoute();
  }
  return result;
}

export async function deleteUserAction(id: string): Promise<DeleteUserResult> {
  const result = await DeleteUserUseCase.execute(id);
  if (result.success) {
    revalidateUsersRoute();
  }
  return result;
}
