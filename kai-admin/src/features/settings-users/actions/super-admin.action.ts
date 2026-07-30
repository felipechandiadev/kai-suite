"use server";

import { revalidatePath } from "next/cache";
import { SuperAdminRequest } from "../infrastructure/super-admin.request";
import type { CreateSuperAdminInput } from "../types/super-admin.types";

const SUPER_ADMINS_PATH = "/settings/companies/super-admins";

export async function listSuperAdminsAction() {
  return SuperAdminRequest.list();
}

export async function createSuperAdminAction(input: CreateSuperAdminInput) {
  const res = await SuperAdminRequest.create(input);
  if (res.success) {
    revalidatePath(SUPER_ADMINS_PATH);
  }
  return res;
}

export async function deleteSuperAdminAction(id: string) {
  const res = await SuperAdminRequest.remove(id);
  if (res.success) {
    revalidatePath(SUPER_ADMINS_PATH);
  }
  return res;
}
