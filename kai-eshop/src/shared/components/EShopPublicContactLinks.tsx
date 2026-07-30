import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook, faInstagram, faTiktok } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Mail, Phone } from "lucide-react";
import type { EShopStorefront } from "@/features/e-shop-storefront/types/storefront.types";
import "@/shared/lib/fontawesome";

type PublicContact = NonNullable<EShopStorefront["publicContact"]>;

type ContactChannel = "phone" | "email" | "instagram" | "tiktok" | "facebook";
type SocialNetwork = "instagram" | "tiktok" | "facebook";

const SOCIAL_ICONS: Record<SocialNetwork, IconDefinition> = {
  instagram: faInstagram,
  tiktok: faTiktok,
  facebook: faFacebook,
};

function socialLabel(url: string, network: SocialNetwork): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    if (network === "instagram") {
      const handle = path.split("/").filter(Boolean).pop();
      return handle ? `@${handle}` : "Instagram";
    }
    if (network === "facebook") {
      const handle = path.split("/").filter(Boolean).pop();
      return handle ?? "Facebook";
    }
    const match = path.match(/@([^/]+)/);
    return match ? `@${match[1]}` : "TikTok";
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
  /** Por defecto muestra todos los canales; en el footer conviene omitir redes (van con iconos FA). */
  omit?: ContactChannel[];
};

type ContactItem = {
  key: ContactChannel;
  href: string;
  label: string;
  external?: boolean;
  icon: "phone" | "email" | SocialNetwork;
};

function ContactLinkIcon({ icon }: { icon: ContactItem["icon"] }) {
  const iconClass = "h-4 w-4 shrink-0";

  if (icon === "phone") {
    return <Phone className={iconClass} aria-hidden />;
  }
  if (icon === "email") {
    return <Mail className={iconClass} aria-hidden />;
  }

  return <FontAwesomeIcon icon={SOCIAL_ICONS[icon]} className={iconClass} aria-hidden />;
}

export function EShopPublicContactLinks({
  contact,
  className = "space-y-1 text-sm",
  linkClassName = "hover:underline",
  omit = [],
}: Props) {
  const hidden = new Set(omit);
  const items: ContactItem[] = [];

  if (!hidden.has("phone") && contact.phone?.trim()) {
    items.push({
      key: "phone",
      href: `tel:${contact.phone.trim().replace(/\s+/g, "")}`,
      label: contact.phone.trim(),
      icon: "phone",
    });
  }
  if (!hidden.has("email") && contact.email?.trim()) {
    items.push({
      key: "email",
      href: `mailto:${contact.email.trim()}`,
      label: contact.email.trim(),
      icon: "email",
    });
  }
  if (!hidden.has("instagram") && contact.instagram?.trim()) {
    items.push({
      key: "instagram",
      href: contact.instagram.trim(),
      label: socialLabel(contact.instagram.trim(), "instagram"),
      external: true,
      icon: "instagram",
    });
  }
  if (!hidden.has("tiktok") && contact.tiktok?.trim()) {
    items.push({
      key: "tiktok",
      href: contact.tiktok.trim(),
      label: socialLabel(contact.tiktok.trim(), "tiktok"),
      external: true,
      icon: "tiktok",
    });
  }
  if (!hidden.has("facebook") && contact.facebook?.trim()) {
    items.push({
      key: "facebook",
      href: contact.facebook.trim(),
      label: socialLabel(contact.facebook.trim(), "facebook"),
      external: true,
      icon: "facebook",
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.key}>
          <a
            href={item.href}
            className={linkClassName}
            {...(item.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <span className="inline-flex items-center gap-2">
              <ContactLinkIcon icon={item.icon} />
              <span>{item.label}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
