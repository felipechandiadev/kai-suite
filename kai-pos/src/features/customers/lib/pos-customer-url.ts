export const POS_CUSTOMER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPosCustomerUuid(id: string): boolean {
  return POS_CUSTOMER_UUID_RE.test(id.trim());
}
