import type { LinePrinterStatus } from "./types";

type Props = {
  status: LinePrinterStatus;
};

export function PrinterStatusDot({ status }: Props) {
  const color =
    status === "online"
      ? "bg-emerald-500"
      : status === "offline"
        ? "bg-red-500"
        : "bg-neutral-400";
  const label =
    status === "online"
      ? "Impresora en línea"
      : status === "offline"
        ? "Impresora desconectada o no disponible"
        : "Sin impresora asignada";

  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
