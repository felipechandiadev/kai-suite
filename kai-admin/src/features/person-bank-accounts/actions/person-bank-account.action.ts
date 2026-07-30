"use server";

import { PersonBankAccountRequest } from "../infrastructure/person-bank-account.request";
import type {
  AddPersonBankAccountInput,
  PersonBankAccountItem,
} from "../types/person-bank-account.types";

export async function listPersonBankAccountsAction(
  personId: string,
): Promise<{ success: true; accounts: PersonBankAccountItem[] } | { success: false; error: string }> {
  try {
    const accounts = await PersonBankAccountRequest.list(personId);
    return { success: true, accounts };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudieron cargar las cuentas bancarias.",
    };
  }
}

export async function addPersonBankAccountAction(
  personId: string,
  input: AddPersonBankAccountInput,
): Promise<{ success: true; accounts: PersonBankAccountItem[] } | { success: false; error: string }> {
  try {
    const accounts = await PersonBankAccountRequest.add(personId, input);
    return { success: true, accounts };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo crear la cuenta bancaria.",
    };
  }
}
