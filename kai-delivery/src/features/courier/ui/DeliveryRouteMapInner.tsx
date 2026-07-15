"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_CENTER: [number, number] = [-35.4264, -71.6554];

export type DeliveryRouteMapStop = {
  id: string;
  sequence: number;
  latitude: number;
  longitude: number;
  customerName?: string | null;
};

function primaryColor(): string {
  if (typeof window === "undefined") return "#1e73ae";
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() ||
    "#1e73ae"
  );
}

function sequenceIcon(sequence: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:#fff;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)">${sequence}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function parseRoutePositions(
  routeGeometry: Record<string, unknown> | null,
  stops: DeliveryRouteMapStop[],
): [number, number][] {
  if (routeGeometry && routeGeometry.type === "LineString") {
    const coordinates = routeGeometry.coordinates;
    if (Array.isArray(coordinates)) {
      const parsed = coordinates
        .filter(
          (coord): coord is [number, number] =>
            Array.isArray(coord) &&
            coord.length >= 2 &&
            typeof coord[0] === "number" &&
            typeof coord[1] === "number",
        )
        .map((coord) => [coord[1], coord[0]] as [number, number]);
      if (parsed.length > 1) return parsed;
    }
  }

  if (stops.length === 0) return [];
  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
  return ordered.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
}

function FitStopsView({
  stops,
  routePositions,
}: {
  stops: DeliveryRouteMapStop[];
  routePositions: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      ...stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
      ...routePositions,
    ];
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 12, { animate: false });
      return;
    }
    if (points.length === 1) {
      map.setView(points[0]!, 15, { animate: false });
      return;
    }
    map.fitBounds(L.latLngBounds(points), {
      padding: [28, 28],
      maxZoom: 15,
      animate: false,
    });
  }, [map, routePositions, stops]);

  return null;
}

type DeliveryRouteMapInnerProps = {
  stops: DeliveryRouteMapStop[];
  routeGeometry: Record<string, unknown> | null;
};

export function DeliveryRouteMapInner({
  stops,
  routeGeometry,
}: DeliveryRouteMapInnerProps) {
  const routePositions = parseRoutePositions(routeGeometry, stops);
  const color = primaryColor();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        attributionControl={false}
        className="h-52 w-full"
      >
        <TileLayer url={OSM_TILES} />
        <FitStopsView stops={stops} routePositions={routePositions} />
        {routePositions.length > 1 ? (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color,
              weight: 4,
              opacity: routeGeometry?.type === "LineString" ? 0.85 : 0.55,
              dashArray: routeGeometry?.type === "LineString" ? undefined : "6 8",
            }}
          />
        ) : null}
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            icon={sequenceIcon(stop.sequence, color)}
          >
            <Popup>
              <span className="text-sm font-medium">
                {stop.sequence}. {stop.customerName ?? "Cliente"}
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
