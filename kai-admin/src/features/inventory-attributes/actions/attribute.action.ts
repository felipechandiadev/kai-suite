"use server";

import { revalidatePath } from "next/cache";
import { ListAttributesUseCase } from "../application/list-attributes.usecase";
import { CreateAttributeUseCase } from "../application/create-attribute.usecase";
import { UpdateAttributeUseCase } from "../application/update-attribute.usecase";
import { DeleteAttributeUseCase } from "../application/delete-attribute.usecase";
import { AttributeRequest } from "../infrastructure/attribute.request";
import type { CreateAttributeFormInput, UpdateAttributeFormInput } from "../domain/attribute.entity";
import type {
  AttributeListItem,
  CreateAttributeResult,
  DeleteAttributeResult,
  UpdateAttributeResult,
} from "../types/attribute.types";

const PATH = "/catalog/attributes";

function revalidateAttributesRoute() {
  revalidatePath(PATH, "page");
}

export async function listAttributesForPage(): Promise<AttributeListItem[]> {
  const r = await ListAttributesUseCase.execute();
  return r.success ? r.attributes : [];
}

export async function getAttributeDetailAction(
  id: string,
): Promise<{ success: true; attribute: AttributeListItem } | { success: false; error: string }> {
  return AttributeRequest.findById(id);
}

export async function createAttributeAction(
  input: CreateAttributeFormInput,
): Promise<CreateAttributeResult> {
  const result = await CreateAttributeUseCase.execute(input);
  if (result.success) {
    revalidateAttributesRoute();
  }
  return result;
}

export async function updateAttributeAction(
  input: UpdateAttributeFormInput,
): Promise<UpdateAttributeResult> {
  const result = await UpdateAttributeUseCase.execute(input);
  if (result.success) {
    revalidateAttributesRoute();
  }
  return result;
}

export async function updateAttributeActiveAction(
  id: string,
  isActive: boolean,
): Promise<UpdateAttributeResult> {
  const r = await AttributeRequest.updatePartial(id, { isActive });
  if (r.success) {
    revalidateAttributesRoute();
  }
  return r;
}

export async function deleteAttributeAction(id: string): Promise<DeleteAttributeResult> {
  const result = await DeleteAttributeUseCase.execute(id);
  if (result.success) {
    revalidateAttributesRoute();
  }
  return result;
}
