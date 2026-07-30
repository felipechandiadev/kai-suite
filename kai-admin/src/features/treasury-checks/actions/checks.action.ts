"use server";

import { revalidatePath } from "next/cache";
import {
  ChecksRequest,
  type ListChecksParams,
} from "../infrastructure/checks.request";

export async function listChecksAction(params: ListChecksParams = {}) {
  return ChecksRequest.list(params);
}

export async function getCommittedOutgoingChecksAction() {
  return ChecksRequest.getCommittedOutgoingSummary();
}

export async function getCheckByIdAction(id: string) {
  return ChecksRequest.getById(id);
}

export async function depositCheckAction(
  id: string,
  body: { depositDate?: string; notes?: string },
) {
  const res = await ChecksRequest.transition(id, "deposit", body);
  if (res.success) revalidatePath("/treasury/checks");
  return res;
}

export async function clearCheckAction(
  id: string,
  body: { clearedDate?: string; notes?: string },
) {
  const res = await ChecksRequest.transition(id, "clear", body);
  if (res.success) revalidatePath("/treasury/checks");
  return res;
}

export async function bounceCheckAction(
  id: string,
  body: { reason: string; notes?: string },
) {
  const res = await ChecksRequest.transition(id, "bounce", body);
  if (res.success) revalidatePath("/treasury/checks");
  return res;
}

export async function voidCheckAction(id: string, body: { notes?: string }) {
  const res = await ChecksRequest.transition(id, "void", body);
  if (res.success) revalidatePath("/treasury/checks");
  return res;
}

export async function endorseCheckAction(
  id: string,
  body: { targetTransactionId: string; notes?: string },
) {
  const res = await ChecksRequest.transition(id, "endorse", body);
  if (res.success) revalidatePath("/treasury/checks");
  return res;
}
