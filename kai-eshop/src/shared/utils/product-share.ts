export type ProductShareNetwork = "whatsapp" | "facebook" | "instagram";

export type ProductShareChannel =
  | {
      id: ProductShareNetwork;
      label: string;
      action: "open";
      href: string;
    }
  | {
      id: ProductShareNetwork;
      label: string;
      action: "copy";
      copyText: string;
      successMessage: string;
    };

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") {
    return false;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** WhatsApp, Facebook e Instagram. WhatsApp/Facebook usan solo la URL para que el unfurl muestre OG. */
export function buildProductShareChannels(input: { url: string }): ProductShareChannel[] {
  const pageUrl = input.url.trim();
  const encodedUrl = encodeURIComponent(pageUrl);

  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      action: "open",
      href: `https://wa.me/?text=${encodedUrl}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      action: "open",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "instagram",
      label: "Instagram",
      action: "copy",
      copyText: pageUrl,
      successMessage: "Enlace copiado — pégalo en Instagram",
    },
  ];
}

export function openShareWindow(href: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer,width=640,height=720");
}
