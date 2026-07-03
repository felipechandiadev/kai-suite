export type TopBarNotificationCountBadgeVariant = "destructive" | "secondary";

const BADGE_VARIANT_CLASS: Record<TopBarNotificationCountBadgeVariant, string> = {
  destructive: "bg-destructive text-destructive-foreground",
  secondary: "bg-secondary text-foreground",
};

/** Contador sobre icono de top bar (misma pastilla que Admin `StockAlertsDropdown` / `NotificationsDropdown`). */
export function TopBarNotificationCountBadge({
  count,
  variant = "destructive",
}: {
  count: number;
  variant?: TopBarNotificationCountBadgeVariant;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${BADGE_VARIANT_CLASS[variant]}`}
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
