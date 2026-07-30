import type { SVGProps } from "react";

/**
 * Icono de caja registradora (no existe en Lucide). Estilo alineado a Lucide: 24×24, trazo 1.75.
 */
export function CashRegisterIcon(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {/* Papel / impresora superior */}
      <path d="M9 2.5h6l1 2.5H8l1-2.5z" />
      <path d="M9.5 5h5" />
      {/* Cuerpo */}
      <rect x="3.5" y="6" width="17" height="15.5" rx="2" />
      {/* Pantalla */}
      <rect x="6.5" y="9" width="11" height="5" rx="1" />
      {/* Teclas */}
      <circle cx="8.25" cy="16.75" r="0.85" />
      <circle cx="12" cy="16.75" r="0.85" />
      <circle cx="15.75" cy="16.75" r="0.85" />
      {/* Ranura cajón */}
      <path d="M7 19.75h10" />
      <path d="M8.5 19.75v1.75h7v-1.75" />
    </svg>
  );
}
