"use server";

import { revalidatePath } from "next/cache";
import { LaundryCatalogRequest } from "../infrastructure/laundry-catalog.request";
import type {
  AttributeValue,
  CareTemplate,
  DeleteResult,
  GarmentAttribute,
  GarmentType,
  MutationResult,
  UpdateAttributeValueInput,
  UpdateCareTemplateInput,
  UpdateGarmentAttributeInput,
  UpdateGarmentTypeInput,
  UpsertAttributeValueInput,
  UpsertCareTemplateInput,
  UpsertGarmentAttributeInput,
  UpsertGarmentTypeInput,
} from "../types/laundry-catalog.types";

const TYPES_PATH = "/laundry/tipos-prenda";
const ATTRIBUTES_PATH = "/laundry/atributos";
const CARE_PATH = "/laundry/instrucciones";

function revalidateTypes() {
  revalidatePath(TYPES_PATH, "page");
}

function revalidateAttributes() {
  revalidatePath(ATTRIBUTES_PATH, "page");
}

function revalidateCare() {
  revalidatePath(CARE_PATH, "page");
}

// --- List (RSC) ---

export async function listGarmentTypesForPage(): Promise<GarmentType[]> {
  const r = await LaundryCatalogRequest.listGarmentTypes(true);
  return r.success ? r.items : [];
}

export async function listGarmentAttributesForPage(): Promise<GarmentAttribute[]> {
  const r = await LaundryCatalogRequest.listGarmentAttributes(true);
  return r.success ? r.items : [];
}

export async function listCareTemplatesForPage(): Promise<CareTemplate[]> {
  const r = await LaundryCatalogRequest.listCareTemplates(true);
  return r.success ? r.items : [];
}

// --- Garment types ---

export async function createGarmentTypeAction(
  input: UpsertGarmentTypeInput,
): Promise<MutationResult<GarmentType>> {
  const result = await LaundryCatalogRequest.createGarmentType({
    code: input.code.trim(),
    name: input.name.trim(),
    active: input.active,
    sortOrder: input.sortOrder,
  });
  if (result.success) {
    revalidateTypes();
  }
  return result;
}

export async function updateGarmentTypeAction(
  input: UpdateGarmentTypeInput,
): Promise<MutationResult<GarmentType>> {
  const { id, ...body } = input;
  const result = await LaundryCatalogRequest.updateGarmentType(id, {
    code: body.code?.trim(),
    name: body.name?.trim(),
    active: body.active,
    sortOrder: body.sortOrder,
  });
  if (result.success) {
    revalidateTypes();
  }
  return result;
}

export async function deleteGarmentTypeAction(id: string): Promise<DeleteResult> {
  const result = await LaundryCatalogRequest.removeGarmentType(id);
  if (result.success) {
    revalidateTypes();
  }
  return result;
}

// --- Garment attributes ---

export async function createGarmentAttributeAction(
  input: UpsertGarmentAttributeInput,
): Promise<MutationResult<GarmentAttribute>> {
  const result = await LaundryCatalogRequest.createGarmentAttribute({
    code: input.code.trim(),
    name: input.name.trim(),
    active: input.active,
    sortOrder: input.sortOrder,
  });
  if (result.success) {
    revalidateAttributes();
  }
  return result;
}

export async function updateGarmentAttributeAction(
  input: UpdateGarmentAttributeInput,
): Promise<MutationResult<GarmentAttribute>> {
  const { id, ...body } = input;
  const result = await LaundryCatalogRequest.updateGarmentAttribute(id, {
    code: body.code?.trim(),
    name: body.name?.trim(),
    active: body.active,
    sortOrder: body.sortOrder,
  });
  if (result.success) {
    revalidateAttributes();
  }
  return result;
}

export async function deleteGarmentAttributeAction(id: string): Promise<DeleteResult> {
  const result = await LaundryCatalogRequest.removeGarmentAttribute(id);
  if (result.success) {
    revalidateAttributes();
  }
  return result;
}

// --- Attribute values ---

export async function createAttributeValueAction(
  input: UpsertAttributeValueInput,
): Promise<MutationResult<AttributeValue>> {
  const result = await LaundryCatalogRequest.createAttributeValue(input.attributeId, {
    label: input.label.trim(),
    active: input.active,
    sortOrder: input.sortOrder,
  });
  if (result.success) {
    revalidateAttributes();
  }
  return result;
}

export async function updateAttributeValueAction(
  input: UpdateAttributeValueInput,
): Promise<MutationResult<AttributeValue>> {
  const { attributeId, valueId, ...body } = input;
  const result = await LaundryCatalogRequest.updateAttributeValue(attributeId, valueId, {
    label: body.label?.trim(),
    active: body.active,
    sortOrder: body.sortOrder,
  });
  if (result.success) {
    revalidateAttributes();
  }
  return result;
}

export async function deleteAttributeValueAction(
  attributeId: string,
  valueId: string,
): Promise<DeleteResult> {
  const result = await LaundryCatalogRequest.removeAttributeValue(attributeId, valueId);
  if (result.success) {
    revalidateAttributes();
  }
  return result;
}

// --- Care templates ---

export async function createCareTemplateAction(
  input: UpsertCareTemplateInput,
): Promise<MutationResult<CareTemplate>> {
  const result = await LaundryCatalogRequest.createCareTemplate({
    label: input.label.trim(),
    text: input.text,
    active: input.active,
    sortOrder: input.sortOrder,
  });
  if (result.success) {
    revalidateCare();
  }
  return result;
}

export async function updateCareTemplateAction(
  input: UpdateCareTemplateInput,
): Promise<MutationResult<CareTemplate>> {
  const { id, ...body } = input;
  const result = await LaundryCatalogRequest.updateCareTemplate(id, {
    label: body.label?.trim(),
    text: body.text,
    active: body.active,
    sortOrder: body.sortOrder,
  });
  if (result.success) {
    revalidateCare();
  }
  return result;
}

export async function deleteCareTemplateAction(id: string): Promise<DeleteResult> {
  const result = await LaundryCatalogRequest.removeCareTemplate(id);
  if (result.success) {
    revalidateCare();
  }
  return result;
}
