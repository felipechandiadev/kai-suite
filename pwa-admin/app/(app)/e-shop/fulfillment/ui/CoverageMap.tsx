"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { PathOptions } from "leaflet";
import { communeSlug } from "@/features/e-shop-delivery/lib/commune-slug";
import type { MauleCommunesFeatureCollection } from "@/features/e-shop-delivery/types/delivery.types";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSONLayer = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

const MAULE_CENTER: [number, number] = [-35.4264, -71.6554];
const MAULE_DEFAULT_ZOOM = 8;

type Props = {
  communesGeoJson: MauleCommunesFeatureCollection;
  enabledCodes: Set<string>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

function styleFor(
  code: string,
  enabledCodes: Set<string>,
  selectedCode: string | null,
): PathOptions {
  const enabled = enabledCodes.has(code);
  const selected = selectedCode === code;
  // Hex literals: Leaflet SVG attrs no resuelven bien `hsl(var(--primary))`.
  const primary = "#1e73ae";
  const muted = "#94a3b8";
  if (selected && enabled) {
    return {
      color: primary,
      weight: 2.5,
      fillColor: primary,
      fillOpacity: 0.45,
    };
  }
  if (selected) {
    return {
      color: primary,
      weight: 2.5,
      fillColor: primary,
      fillOpacity: 0.2,
    };
  }
  if (enabled) {
    return {
      color: primary,
      weight: 1.5,
      fillColor: primary,
      fillOpacity: 0.28,
    };
  }
  return {
    color: muted,
    weight: 1,
    fillColor: muted,
    fillOpacity: 0.08,
  };
}

function FitBoundsController({
  geoJson,
  selectedCode,
}: {
  geoJson: MauleCommunesFeatureCollection;
  selectedCode: string | null;
}) {
  // Client-only hooks from react-leaflet / leaflet
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require("react-leaflet") as typeof import("react-leaflet");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  const map = useMap();
  const fittedOnce = useRef(false);

  useEffect(() => {
    if (!fittedOnce.current && geoJson.features.length > 0) {
      const layer = L.geoJSON(geoJson as never);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
        fittedOnce.current = true;
      }
    }
  }, [geoJson, map, L]);

  useEffect(() => {
    if (!selectedCode) return;
    const feature = geoJson.features.find((f) => {
      const name = f.properties?.Comuna;
      return name ? communeSlug(name) === selectedCode : false;
    });
    if (!feature) return;
    const layer = L.geoJSON(feature as never);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }
  }, [selectedCode, geoJson, map, L]);

  return null;
}

export default function CoverageMap({
  communesGeoJson,
  enabledCodes,
  selectedCode,
  onSelect,
}: Props) {
  const dataKey = useMemo(
    () =>
      `${selectedCode ?? ""}|${[...enabledCodes].sort().join(",")}|${communesGeoJson.features.length}`,
    [selectedCode, enabledCodes, communesGeoJson.features.length],
  );

  return (
    <div
      className="h-full w-full overflow-hidden rounded-xl border border-border"
      data-test-id="coverage-map"
    >
      <MapContainer
        center={MAULE_CENTER}
        zoom={MAULE_DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
        zoomControl
        scrollWheelZoom
        doubleClickZoom
        touchZoom
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBoundsController geoJson={communesGeoJson} selectedCode={selectedCode} />
        <GeoJSONLayer
          key={dataKey}
          data={communesGeoJson as never}
          style={(feature) => {
            const name = (feature?.properties as { Comuna?: string } | undefined)?.Comuna;
            const code = name ? communeSlug(name) : "";
            return styleFor(code, enabledCodes, selectedCode);
          }}
          onEachFeature={(feature, layer) => {
            const name = (feature.properties as { Comuna?: string } | null)?.Comuna;
            if (!name) return;
            const code = communeSlug(name);
            layer.on({
              click: () => onSelect(code),
            });
            layer.bindTooltip(name, { sticky: true, direction: "top" });
          }}
        />
      </MapContainer>
    </div>
  );
}
