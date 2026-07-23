"use server";

import { revalidatePath } from "next/cache";
import { DiningBoardDisplaysRequest } from "../infrastructure/dining-board-displays.request";

export async function listDiningBoardDisplaysAction(branchId?: string) {
  return DiningBoardDisplaysRequest.list(branchId);
}

export async function createDiningBoardDisplayAction(input: {
  branchId: string;
  name: string;
}) {
  const res = await DiningBoardDisplaysRequest.create(input);
  if (res.success) {
    revalidatePath("/settings/kai-board");
  }
  return res;
}

export async function revokeDiningBoardDisplayAction(id: string) {
  const res = await DiningBoardDisplaysRequest.revoke(id);
  if (res.success) {
    revalidatePath("/settings/kai-board");
  }
  return res;
}
