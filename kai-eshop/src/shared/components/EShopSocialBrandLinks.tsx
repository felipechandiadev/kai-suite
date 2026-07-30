import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faInstagram, faTiktok } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { EShopStorefront } from "@/features/e-shop-storefront/types/storefront.types";
import "@/shared/lib/fontawesome";

type PublicContact = NonNullable<EShopStorefront["publicContact"]>;

type SocialNetwork = "instagram" | "tiktok" | "facebook";

const SOCIAL_ICONS: Record<SocialNetwork, IconDefinition> = {
  instagram: faInstagram,
  tiktok: faTiktok,
  facebook: faFacebook,
};

function socialAriaLabel(network: SocialNetwork, url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    if (network === "instagram") {
      const handle = path.split("/").filter(Boolean).pop();
      return handle ? `Instagram @${handle}` : "Instagram";
    }
    if (network === "facebook") {
      const handle = path.split("/").filter(Boolean).pop();
      return handle ? `Facebook ${handle}` : "Facebook";
    }
    const match = path.match(/@([^/]+)/);
    return match ? `TikTok @${match[1]}` : "TikTok";
  } catch {
    if (network === "instagram") return "Instagram";
    if (network === "facebook") return "Facebook";
    return "TikTok";
  }
}

type Props = {
  contact: PublicContact;
  className?: string;
  linkClassName?: string;
  iconClassName?: string;
};

export function EShopSocialBrandLinks({
  contact,
  className = "flex flex-wrap items-center gap-3",
  linkClassName = "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-white/50 hover:bg-white/10",
  iconClassName = "h-5 w-5",
}: Props) {
  const items: Array<{ key: SocialNetwork; href: string; icon: IconDefinition; label: string }> = [];

  if (contact.instagram?.trim()) {
    const href = contact.instagram.trim();
    items.push({
      key: "instagram",
      href,
      icon: SOCIAL_ICONS.instagram,
      label: socialAriaLabel("instagram", href),
    });
  }
  if (contact.tiktok?.trim()) {
    const href = contact.tiktok.trim();
    items.push({
      key: "tiktok",
      href,
      icon: SOCIAL_ICONS.tiktok,
      label: socialAriaLabel("tiktok", href),
    });
  }
  if (contact.facebook?.trim()) {
    const href = contact.facebook.trim();
    items.push({
      key: "facebook",
      href,
      icon: SOCIAL_ICONS.facebook,
      label: socialAriaLabel("facebook", href),
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className} role="list" aria-label="Redes sociales">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className={linkClassName}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          role="listitem"
        >
          <FontAwesomeIcon icon={item.icon} className={iconClassName} aria-hidden />
        </a>
      ))}
    </div>
  );
}
