"use client";

import { TextField } from "@kai/ui";
import { Select } from "@kai/ui";
import type { EShopNavLink, EShopNavLinkKind } from "../types/eshop-footer.types";
import type { EShopFooterLinkGroup } from "../types/eshop-footer.types";
import {
  INTERNAL_ROUTE_OPTIONS,
  NAV_LINK_KIND_LABELS,
} from "@/features/e-shop-topbar/types/eshop-topbar.types";

type LinkEditorProps = {
  link: EShopNavLink;
  onChange: (link: EShopNavLink) => void;
  onRemove: () => void;
};

function FooterLinkRow({ link, onChange, onRemove }: LinkEditorProps) {
  const setKind = (kind: EShopNavLinkKind) => {
    let href = link.href;
    if (kind === "route") href = "/nosotros";
    if (kind === "anchor") href = "#donde-estamos";
    if (kind === "external") href = "https://";
    onChange({ ...link, kind, href });
  };

  return (
    <div className="space-y-2 rounded border border-border/60 p-3">
      <div className="flex justify-between gap-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={link.enabled}
            onChange={(e) => onChange({ ...link, enabled: e.target.checked })}
          />
          Visible
        </label>
        <button
          type="button"
          className="text-xs text-destructive"
          onClick={onRemove}
        >
          Quitar
        </button>
      </div>
      <TextField
        label="Etiqueta"
        value={link.label}
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <Select
        label="Tipo"
        value={link.kind}
        onChange={(v) => setKind(v as EShopNavLinkKind)}
        options={(
          Object.entries(NAV_LINK_KIND_LABELS) as [EShopNavLinkKind, string][]
        ).map(([id, label]) => ({ id, label }))}
      />
      {link.kind === "route" ? (
        <Select
          label="Ruta"
          value={link.href}
          onChange={(v) => onChange({ ...link, href: String(v ?? "") })}
          options={INTERNAL_ROUTE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
        />
      ) : (
        <TextField
          label={link.kind === "anchor" ? "Ancla" : "URL"}
          value={link.href}
          onChange={(e) => onChange({ ...link, href: e.target.value })}
        />
      )}
    </div>
  );
}

type GroupProps = {
  group: EShopFooterLinkGroup;
  onChange: (group: EShopFooterLinkGroup) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function EShopFooterGroupEditor({
  group,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: GroupProps) {
  const updateLink = (index: number, link: EShopNavLink) => {
    const links = [...group.links];
    links[index] = link;
    onChange({ ...group, links });
  };

  const addLink = () => {
    if (group.links.length >= 8) return;
    onChange({
      ...group,
      links: [
        ...group.links,
        {
          id: crypto.randomUUID(),
          label: "Enlace",
          kind: "route",
          href: "/nosotros",
          enabled: true,
          order: group.links.length,
        },
      ],
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={group.enabled}
            onChange={(e) => onChange({ ...group, enabled: e.target.checked })}
          />
          Columna visible
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            ↑
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            ↓
          </button>
          <button
            type="button"
            className="rounded border border-destructive px-2 py-1 text-xs text-destructive"
            onClick={onRemove}
          >
            Eliminar grupo
          </button>
        </div>
      </div>
      <TextField
        label="Título de columna"
        value={group.title}
        onChange={(e) => onChange({ ...group, title: e.target.value })}
      />
      <div className="space-y-2">
        {group.links.map((link, i) => (
          <FooterLinkRow
            key={link.id}
            link={link}
            onChange={(l) => updateLink(i, l)}
            onRemove={() =>
              onChange({
                ...group,
                links: group.links.filter((_, idx) => idx !== i),
              })
            }
          />
        ))}
      </div>
      <button
        type="button"
        className="text-sm text-primary hover:underline"
        onClick={addLink}
        disabled={group.links.length >= 8}
      >
        + Añadir enlace al grupo
      </button>
    </div>
  );
}
