"use client";

import type { MenuResolvedTheme } from "@/features/kai-menu/types/menu-theme.types";

type Props = {
  resolved: MenuResolvedTheme;
  menuPublicUrl?: string | null;
};

export function MenuAppearancePreview({ resolved, menuPublicUrl }: Props) {
  const t = resolved.tokens;
  const href = menuPublicUrl?.trim().replace(/\/$/, "") || null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border shadow-sm"
      data-test-id="menu-appearance-preview"
      style={{
        backgroundColor: t.background,
        color: t.foreground,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-sm"
        style={{ backgroundColor: t.chrome, color: t.chromeForeground }}
      >
        <span className="font-semibold">Mi restaurante</span>
        <span className="text-xs opacity-80">Menú</span>
      </div>
      <div className="space-y-3 p-4">
        <div
          className="flex gap-3 rounded-xl border p-3"
          style={{ borderColor: t.border, backgroundColor: t.card }}
        >
          <div
            className="h-16 w-16 shrink-0 rounded-lg"
            style={{ backgroundColor: t.border }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Plato ejemplo</p>
            <p className="mt-1 text-xs" style={{ color: t.muted }}>
              Descripción breve del plato
            </p>
            <p className="mt-2 text-sm font-semibold" style={{ color: t.primary }}>
              $12.990
            </p>
          </div>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: t.primary }}
            data-test-id="menu-appearance-open-carta"
          >
            Ver carta
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold text-white opacity-60"
            style={{ backgroundColor: t.primary }}
            title="Configure NEXT_PUBLIC_KAI_MENU_URL"
          >
            Ver carta
          </button>
        )}
      </div>
    </div>
  );
}
