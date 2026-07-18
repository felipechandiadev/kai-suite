"use server";

import { revalidatePath } from "next/cache";
import { SupplierRequest } from "../infrastructure/supplier.request";
import {
  chileGeoFromPersonFields,
  geoPayloadFromChileGeo,
} from "@/features/chile-person/lib/person-geo-payload.util";
import type {
  PersonGeoFields,
  SupplierDetailView,
  SupplierGridRow,
  UpdateSupplierPayload,
} from "../types/supplier.types";

const SUPPLIERS_PATH = "/purchasing/suppliers";

export async function getSupplierDetailAction(
  supplierId: string,
): Promise<{ success: true; supplier: SupplierDetailView } | { success: false; error: string }> {
  const id = supplierId?.trim();
  if (!id) {
    return { success: false, error: "Proveedor no especificado." };
  }
  const supplier = await SupplierRequest.getById(id);
  if (!supplier) {
    return { success: false, error: "No se pudo cargar el proveedor." };
  }
  return { success: true, supplier };
}

export async function updateSupplierAction(
  supplierId: string,
  payload: UpdateSupplierPayload,
): Promise<{ success: true; supplier: SupplierDetailView } | { success: false; error: string }> {
  const id = supplierId?.trim();
  if (!id) {
    return { success: false, error: "Proveedor no especificado." };
  }
  const r = await SupplierRequest.update(id, payload);
  if (r.success) {
    revalidatePath(SUPPLIERS_PATH, "page");
  }
  return r;
}

export type CreateSupplierFormInput = {
  personId?: string;
  personType?: "NATURAL" | "COMPANY";
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType?: "RUT" | "PASSPORT" | "OTHER";
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  supplierType: string;
  defaultPaymentTermDays: number;
} & PersonGeoFields;

export type CreateSupplierResult = { success: true; id: string } | { success: false; error: string };

function personGeoFromInput(input: CreateSupplierFormInput) {
  return {
    ...geoPayloadFromChileGeo(chileGeoFromPersonFields(input)),
    activityStarted: input.activityStarted === true,
    economicActivities:
      input.activityStarted && input.economicActivities?.length
        ? input.economicActivities
        : undefined,
  };
}

export async function listSuppliersForGrid(): Promise<{ rows: SupplierGridRow[]; total: number }> {
  return SupplierRequest.list(500, 0);
}

export async function createSupplierAction(input: CreateSupplierFormInput): Promise<CreateSupplierResult> {
  const supplierType = input.supplierType?.trim() || "DISTRIBUTOR";
  const term = Math.max(0, Math.round(Number(input.defaultPaymentTermDays) || 0));

  if (input.personId?.trim()) {
    const r = await SupplierRequest.create({
      personId: input.personId.trim(),
      supplierType,
      defaultPaymentTermDays: term,
    });
    if (r.success) {
      revalidatePath(SUPPLIERS_PATH, "page");
    }
    return r;
  }

  const personType = input.personType === "COMPANY" ? "COMPANY" : "NATURAL";
  const docNum = input.documentNumber?.trim() ?? "";
  if (!docNum) {
    return { success: false, error: "El número de documento es obligatorio." };
  }

  if (personType === "COMPANY") {
    const bn = input.businessName?.trim() ?? "";
    if (!bn) {
      return { success: false, error: "La razón social es obligatoria para una empresa." };
    }
    const person = {
      type: "COMPANY" as const,
      firstName: bn,
      businessName: bn,
      documentType: "RUT" as const,
      documentNumber: docNum,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      ...personGeoFromInput(input),
    };
    const r = await SupplierRequest.create({
      person,
      supplierType,
      defaultPaymentTermDays: term,
    });
    if (r.success) {
      revalidatePath(SUPPLIERS_PATH, "page");
    }
    return r;
  }

  const fn = input.firstName?.trim() ?? "";
  if (!fn) {
    return { success: false, error: "El nombre es obligatorio para una persona." };
  }
  const dt = input.documentType ?? "RUT";

  const person = {
    type: "NATURAL" as const,
    firstName: fn,
    lastName: input.lastName?.trim() || undefined,
    documentType: dt,
    documentNumber: docNum,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    ...personGeoFromInput(input),
  };

  const r = await SupplierRequest.create({
    person,
    supplierType,
    defaultPaymentTermDays: term,
  });
  if (r.success) {
    revalidatePath(SUPPLIERS_PATH, "page");
  }
  return r;
}
