/** Props compartidas para TextField teléfono Chile (+56). */
export const CHILE_PHONE_PREFIX = "+56";

export const chilePhoneTextFieldProps = {
  type: "tel" as const,
  phonePrefix: CHILE_PHONE_PREFIX,
  startSymbol: CHILE_PHONE_PREFIX,
  inputMode: "tel" as const,
  autoComplete: "tel" as const,
};
