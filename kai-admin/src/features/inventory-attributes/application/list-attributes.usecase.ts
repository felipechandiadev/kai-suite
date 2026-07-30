import { AttributeRequest } from "../infrastructure/attribute.request";
import type { ListAttributesResult } from "../types/attribute.types";

export class ListAttributesUseCase {
  static async execute(): Promise<ListAttributesResult> {
    return AttributeRequest.findAll(true);
  }
}
