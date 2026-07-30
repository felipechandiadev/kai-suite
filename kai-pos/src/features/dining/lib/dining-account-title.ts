export function diningAccountTitle(order: {
  displayLabel: string;
  profile?: { customerName?: string | null } | null;
}): string {
  const name = order.profile?.customerName?.trim();
  return name || order.displayLabel;
}
