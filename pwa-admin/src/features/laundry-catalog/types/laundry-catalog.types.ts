export type GarmentType = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type AttributeValue = {
  id: string;
  attributeId: string;
  label: string;
  active: boolean;
  sortOrder: number;
};

export type GarmentAttribute = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
  values: AttributeValue[];
};

export type CareTemplate = {
  id: string;
  label: string;
  text: string;
  active: boolean;
  sortOrder: number;
};

export type UpsertGarmentTypeInput = {
  code: string;
  name: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpdateGarmentTypeInput = {
  id: string;
  code?: string;
  name?: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpsertGarmentAttributeInput = {
  code: string;
  name: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpdateGarmentAttributeInput = {
  id: string;
  code?: string;
  name?: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpsertAttributeValueInput = {
  attributeId: string;
  label: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpdateAttributeValueInput = {
  attributeId: string;
  valueId: string;
  label?: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpsertCareTemplateInput = {
  label: string;
  text: string;
  active?: boolean;
  sortOrder?: number;
};

export type UpdateCareTemplateInput = {
  id: string;
  label?: string;
  text?: string;
  active?: boolean;
  sortOrder?: number;
};

export type MutationResult<T = void> =
  | ({ success: true } & (T extends void ? object : { item: T }))
  | { success: false; error: string };

export type DeleteResult = { success: true } | { success: false; error: string };
