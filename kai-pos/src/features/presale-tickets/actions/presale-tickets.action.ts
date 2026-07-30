"use server";

import { PresaleTicketsRequest } from "../infrastructure/presale-tickets.request";

export async function createPresaleTicketAction(
  body: Parameters<typeof PresaleTicketsRequest.create>[0],
) {
  return PresaleTicketsRequest.create(body);
}

export async function findPresaleTicketByCodeAction(code: string, pointOfSaleId: string) {
  return PresaleTicketsRequest.findByCode(code, pointOfSaleId);
}
