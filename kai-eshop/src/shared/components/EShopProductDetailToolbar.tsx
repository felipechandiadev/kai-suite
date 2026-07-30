"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebook,
  faInstagram,
  faWhatsapp,
} from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { IconButton } from "@kai/ui";
import {
  buildProductShareChannels,
  copyTextToClipboard,
  openShareWindow,
  type ProductShareChannel,
  type ProductShareNetwork,
} from "@/shared/utils/product-share";
import "@/shared/lib/fontawesome";

const SHARE_ICONS: Record<ProductShareNetwork, IconDefinition> = {
  whatsapp: faWhatsapp,
  facebook: faFacebook,
  instagram: faInstagram,
};

type Props = {
  shareUrl: string;
  preview?: boolean;
};

export function EShopProductDetailToolbar({ shareUrl, preview = false }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const shareChannels = useMemo(
    () => (shareUrl.trim() ? buildProductShareChannels({ url: shareUrl.trim() }) : []),
    [shareUrl],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu, menuOpen]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/productos");
  };

  const handleShareClick = () => {
    if (preview || !shareUrl.trim()) {
      return;
    }
    setFeedback(null);
    setMenuOpen((open) => !open);
  };

  const handleChannelClick = async (channel: ProductShareChannel) => {
    if (channel.action === "open") {
      openShareWindow(channel.href);
      closeMenu();
      return;
    }
    const ok = await copyTextToClipboard(channel.copyText);
    setFeedback(ok ? channel.successMessage : "No se pudo copiar el enlace");
  };

  if (preview) {
    return (
      <div className="mb-4 flex items-center justify-start">
        <IconButton
          icon="ArrowLeft"
          variant="neutral"
          size="md"
          ariaLabel="Volver al catálogo"
          onClick={() => router.push("/productos")}
        />
      </div>
    );
  }

  return (
    <div className="relative mb-4 flex items-center justify-between gap-3">
      <IconButton
        icon="ArrowLeft"
        variant="neutral"
        size="md"
        ariaLabel="Volver a la página anterior"
        onClick={handleBack}
      />

      <div ref={menuRef} className="relative">
        <IconButton
          icon="Share2"
          variant="neutral"
          size="md"
          ariaLabel="Compartir producto"
          aria-expanded={menuOpen}
          onClick={handleShareClick}
          disabled={!shareUrl.trim()}
        />

        {menuOpen ? (
          <div
            role="menu"
            aria-label="Compartir en redes sociales"
            className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,14.5rem)] overflow-hidden rounded-xl border border-border bg-surface p-2 shadow-lg"
          >
            <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Compartir en</p>
            <ul className="space-y-1">
              {shareChannels.map((channel) => (
                <li key={channel.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-hover"
                    onClick={() => {
                      void handleChannelClick(channel);
                    }}
                  >
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                        channel.id === "whatsapp"
                          ? "bg-[#25D366]"
                          : channel.id === "facebook"
                            ? "bg-[#1877F2]"
                            : "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]"
                      }`}
                      aria-hidden
                    >
                      <FontAwesomeIcon icon={SHARE_ICONS[channel.id]} className="h-4.5 w-4.5" />
                    </span>
                    <span className="font-medium text-foreground">{channel.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            {feedback ? (
              <p className="mt-2 border-t border-border px-2 pt-2 text-xs text-muted-foreground">{feedback}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
