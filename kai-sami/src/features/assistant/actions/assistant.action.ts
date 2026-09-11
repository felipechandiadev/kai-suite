"use server";

import { AssistantRequest } from "../infrastructure/assistant.request";
import { redirectToLoginServer } from "@/lib/auth/redirect-to-login";

function guard<T extends { success: true } | { success: false; unauthorized?: boolean }>(
  r: T,
): T {
  if (!r.success && r.unauthorized) redirectToLoginServer();
  return r;
}

export async function sendAssistantMessageAction(
  message: string,
  conversationId?: string | null,
) {
  return guard(await AssistantRequest.chat({ message, conversationId }));
}

export async function speakAssistantTextAction(text: string) {
  return guard(await AssistantRequest.speak(text));
}

export async function listConversationsAction() {
  return guard(await AssistantRequest.conversations());
}

export async function getConversationAction(id: string) {
  return guard(await AssistantRequest.conversation(id));
}

export async function getAssistantReportAction(id: string) {
  return guard(await AssistantRequest.report(id));
}

export async function exportAssistantReportAction(
  reportId: string,
  format: "xlsx" | "pdf",
) {
  return guard(await AssistantRequest.export(reportId, format));
}

export async function sendAssistantFeedbackAction(auditId: string, feedback: string) {
  return guard(await AssistantRequest.feedback(auditId, feedback));
}

export async function listFavoritesAction() {
  return guard(await AssistantRequest.favorites());
}

export async function addFavoriteAction(title: string, prompt: string) {
  return guard(await AssistantRequest.addFavorite(title, prompt));
}

export async function removeFavoriteAction(id: string) {
  return guard(await AssistantRequest.removeFavorite(id));
}

export async function listScheduledReportsAction() {
  return guard(await AssistantRequest.scheduledReports());
}

export async function addScheduledReportAction(
  title: string,
  prompt: string,
  cronExpr?: string,
) {
  return guard(await AssistantRequest.addScheduled(title, prompt, cronExpr));
}

export async function getAssistantCatalogAction() {
  return guard(await AssistantRequest.catalog());
}
