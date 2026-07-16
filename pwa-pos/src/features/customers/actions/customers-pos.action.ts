"use server";

import type { PosCreateCustomerInput } from "../types/pos-customer-create.types";
import type { PosCustomerDetailBundlePaging } from "../lib/pos-customer-detail-url";
import { CustomersPosRequest } from "../infrastructure/customers-pos.request";
import {
  chileGeoFromPersonFields,
  geoPayloadFromChileGeo,
} from "@/features/chile-person/lib/person-geo-payload.util";

export async function searchPosCustomersAction(input: {
  query?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}) {
  return CustomersPosRequest.search(input);
}

export async function getCustomerPosDetailBundleAction(
  customerId: string,
  paging?: PosCustomerDetailBundlePaging,
) {
  return CustomersPosRequest.getCustomerDetailBundle(customerId, paging);
}

export async function getCustomerPosPaymentSourcesAction(customerId: string) {
  return CustomersPosRequest.getPosPaymentSources(customerId);
}

export async function getBackorderDetailPosAction(transactionId: string) {
  return CustomersPosRequest.getBackorderDetail({ transactionId });
}

export async function createPosCustomerAction(input: PosCreateCustomerInput) {
  const personType = input.personType === "COMPANY" ? "COMPANY" : "NATURAL";
  const docNum = input.documentNumber?.trim() ?? "";
  if (!docNum) {
    return { success: false as const, message: "El número de documento es obligatorio." };
  }

  const creditLimit = Math.max(0, Math.round(Number(input.creditLimit) || 0));
  const day = Number(input.paymentDayOfMonth);
  const paymentDayOfMonth = [5, 10, 15, 20, 25, 30].includes(day)
    ? (day as PosCreateCustomerInput["paymentDayOfMonth"])
    : 5;
  const base = {
    creditLimit,
    paymentDayOfMonth,
    notes: input.notes?.trim() || null,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    ...geoPayloadFromChileGeo(chileGeoFromPersonFields(input)),
    economicActivities: input.economicActivities?.length ? input.economicActivities : undefined,
  };

  if (personType === "COMPANY") {
    const bn = input.businessName?.trim() ?? "";
    if (!bn) {
      return { success: false as const, message: "La razón social es obligatoria para una empresa." };
    }
    return CustomersPosRequest.create({
      personType: "COMPANY",
      firstName: bn,
      businessName: bn,
      documentType: "RUT",
      documentNumber: docNum,
      ...base,
    });
  }

  const fn = input.firstName?.trim() ?? "";
  if (!fn) {
    return { success: false as const, message: "El nombre es obligatorio para una persona." };
  }
  const dt = input.documentType;
  if (dt === "RUT") {
    return {
      success: false as const,
      message: "Una persona no puede usar RUT; elija empresa u otro documento.",
    };
  }

  return CustomersPosRequest.create({
    personType: "NATURAL",
    firstName: fn,
    lastName: input.lastName?.trim() || undefined,
    documentType: dt,
    documentNumber: docNum,
    ...base,
  });
}
