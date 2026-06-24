"use server";

import {
  clearCustomerSessionToken,
  getCustomerSessionToken,
  setCustomerSessionToken,
} from "@/lib/eshop-customer-session";
import { getValidCustomerSessionToken } from "../lib/customer-portal-session";
import { EShopCustomerAccountRequest } from "../infrastructure/customer-account.request";

async function requireSession() {
  const token = await getCustomerSessionToken();
  if (!token) throw new Error("Debes iniciar sesión");
  return token;
}

export async function checkUsernameAvailabilityAction(username: string) {
  try {
    const result = await EShopCustomerAccountRequest.checkUsername(username);
    return { success: true as const, ...result };
  } catch (e) {
    return {
      success: false as const,
      available: false,
      message: e instanceof Error ? e.message : "Error al verificar usuario",
    };
  }
}

export async function registerCustomerAction(body: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  documentNumber?: string;
}) {
  try {
    const result = await EShopCustomerAccountRequest.register(body);
    await clearCustomerSessionToken();
    await setCustomerSessionToken(result.sessionToken);
    return { success: true as const, emailVerificationRequired: result.emailVerificationRequired };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error al registrarse" };
  }
}

export async function loginCustomerAction(body: { login: string; password: string }) {
  try {
    const result = await EShopCustomerAccountRequest.login(body);
    await clearCustomerSessionToken();
    await setCustomerSessionToken(result.sessionToken);
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Credenciales inválidas" };
  }
}

export async function logoutCustomerAction() {
  await clearCustomerSessionToken();
  return { success: true as const };
}

export async function verifyEmailAction(token: string) {
  try {
    await EShopCustomerAccountRequest.verifyEmail(token);
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Token inválido" };
  }
}

export async function getCustomerSummaryAction() {
  try {
    const token = await requireSession();
    const summary = await EShopCustomerAccountRequest.getSummary(token);
    return { success: true as const, summary };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getCustomerProfileAction() {
  try {
    const token = await requireSession();
    const profile = await EShopCustomerAccountRequest.getProfile(token);
    return { success: true as const, profile };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateCustomerProfileAction(body: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}) {
  try {
    const token = await requireSession();
    const profile = await EShopCustomerAccountRequest.updateProfile(token, body);
    return { success: true as const, profile };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listCustomerOrdersAction(page = 1) {
  try {
    const token = await requireSession();
    const result = await EShopCustomerAccountRequest.listOrders(token, page);
    return { success: true as const, ...result };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error",
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    };
  }
}

export async function getCustomerOrderAction(orderId: string) {
  try {
    const token = await requireSession();
    const order = await EShopCustomerAccountRequest.getOrder(token, orderId);
    return { success: true as const, order };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getCustomerPaymentsAction() {
  try {
    const token = await requireSession();
    const result = await EShopCustomerAccountRequest.getPayments(token);
    return { success: true as const, payments: result.payments };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error", payments: [] };
  }
}

export async function getCustomerDebtsAction() {
  try {
    const token = await requireSession();
    const debts = await EShopCustomerAccountRequest.getDebts(token);
    return { success: true as const, debts };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error",
      debts: { quotas: [], totalDue: 0, credit: null },
    };
  }
}

export async function isCustomerLoggedInAction() {
  const token = await getValidCustomerSessionToken();
  return Boolean(token);
}
