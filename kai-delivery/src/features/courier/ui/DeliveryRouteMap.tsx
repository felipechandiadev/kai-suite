"use client";

import dynamic from "next/dynamic";
import type { DeliveryRouteMapStop } from "./DeliveryRouteMapInner";

const DeliveryRouteMapInner = dynamic(
  () =>
    import("./DeliveryRouteMapInner").then((mod) => mod.DeliveryRouteMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

type DeliveryRouteMapProps = {
  stops: DeliveryRouteMapStop[];
  routeGeometry: Record<string, unknown> | null;
};

export function DeliveryRouteMap({ stops, routeGeometry }: DeliveryRouteMapProps) {
  if (stops.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Sin paradas en la ruta
      </div>
    );
  }

  return <DeliveryRouteMapInner stops={stops} routeGeometry={routeGeometry} />;
}
