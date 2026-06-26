import Image from "next/image";

export type MercadoPagoLogoVariant =
  | "color-horizontal"
  | "color-vertical"
  | "pluma-horizontal"
  | "pluma-vertical";

const LOGO_SRC: Record<MercadoPagoLogoVariant, string> = {
  "color-horizontal":
    "/integrations/mercado-pago/MP_RGB_HANDSHAKE_color_horizontal.svg",
  "color-vertical": "/integrations/mercado-pago/MP_RGB_HANDSHAKE_color_vertical.svg",
  "pluma-horizontal":
    "/integrations/mercado-pago/MP_RGB_HANDSHAKE_pluma_horizontal.svg",
  "pluma-vertical": "/integrations/mercado-pago/MP_RGB_HANDSHAKE_pluma_vertical.svg",
};

const LOGO_DIMENSIONS: Record<
  MercadoPagoLogoVariant,
  { width: number; height: number }
> = {
  "color-horizontal": { width: 1049, height: 425 },
  "color-vertical": { width: 425, height: 1049 },
  "pluma-horizontal": { width: 1049, height: 425 },
  "pluma-vertical": { width: 425, height: 1049 },
};

const HORIZONTAL_VARIANTS = new Set<MercadoPagoLogoVariant>([
  "color-horizontal",
  "pluma-horizontal",
]);

type Props = {
  variant?: MercadoPagoLogoVariant;
  /** Ancho en px — recomendado para logos horizontales. */
  width?: number;
  /** Altura en px — recomendado para logos verticales. */
  height?: number;
  className?: string;
  priority?: boolean;
};

function resolveSize(
  variant: MercadoPagoLogoVariant,
  width?: number,
  height?: number,
): { width: number; height: number } {
  const { width: intrinsicW, height: intrinsicH } = LOGO_DIMENSIONS[variant];
  const aspect = intrinsicW / intrinsicH;

  if (width != null) {
    return { width, height: Math.round(width / aspect) };
  }
  if (height != null) {
    return { width: Math.round(height * aspect), height };
  }
  if (HORIZONTAL_VARIANTS.has(variant)) {
    const w = 150;
    return { width: w, height: Math.round(w / aspect) };
  }
  const h = 64;
  return { width: Math.round(h * aspect), height: h };
}

export function MercadoPagoLogo({
  variant = "color-horizontal",
  width,
  height,
  className = "",
  priority = false,
}: Props) {
  const size = resolveSize(variant, width, height);

  return (
    <Image
      src={LOGO_SRC[variant]}
      alt="Mercado Pago"
      width={size.width}
      height={size.height}
      priority={priority}
      className={`inline-block object-contain object-left ${className}`.trim()}
      style={{ width: size.width, height: size.height }}
    />
  );
}
