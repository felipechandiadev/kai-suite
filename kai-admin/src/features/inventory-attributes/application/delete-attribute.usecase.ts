import { AttributeRequest } from "../infrastructure/attribute.request";
import type { DeleteAttributeResult } from "../types/attribute.types";

export class DeleteAttributeUseCase {
  static async execute(id: string): Promise<DeleteAttributeResult> {
    return AttributeRequest.remove(id);
  }
}
