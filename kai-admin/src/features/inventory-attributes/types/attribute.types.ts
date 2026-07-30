export type AttributeListItem = {
  id: string;
  name: string;
  description: string | null;
  options: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListAttributesResult =
  | { success: true; attributes: AttributeListItem[] }
  | { success: false; error: string; attributes: [] };

export type CreateAttributeResult =
  | { success: true; attribute: AttributeListItem }
  | { success: false; error: string };

export type UpdateAttributeResult =
  | { success: true; attribute: AttributeListItem }
  | { success: false; error: string };

export type DeleteAttributeResult = { success: true } | { success: false; error: string };
