import { METAL_TYPE_OPTIONS } from "../types/metal-price.types";

export const METAL_SELECT_OPTIONS = METAL_TYPE_OPTIONS.map((metal) => ({
  id: metal,
  label: metal,
}));
