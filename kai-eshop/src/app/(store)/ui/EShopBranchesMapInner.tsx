"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { EShopBranch } from "@/features/e-shop-storefront/types/storefront.types";
import "./eshop-branches-map.css";

type BranchWithLocation = EShopBranch & { location: { lat: number; lng: number } };

const CARTO_LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

const DEFAULT_CENTER: [number, number] = [-33.4489, -70.6693];
const DEFAULT_ZOOM = 14;

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "",
});

function branchesViewKey(branches: BranchWithLocation[]): string {
  return branches
    .map((b) => `${b.id}:${b.location.lat},${b.location.lng}`)
    .join("|");
}

function FitMapView({
  branches,
  viewKey,
}: {
  branches: BranchWithLocation[];
  viewKey: string;
}) {
  const map = useMap();

  useEffect(() => {
    if (branches.length === 0) return;

    if (branches.length === 1) {
      const { lat, lng } = branches[0].location;
      map.setView([lat, lng], 15, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(branches.map((b) => [b.location.lat, b.location.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15, animate: false });
  }, [map, viewKey]);

  return null;
}

type Props = {
  branches: BranchWithLocation[];
  /** Solo botones +/-; desactiva rueda, doble clic y pinch. */
  zoomButtonsOnly?: boolean;
};

export default function EShopBranchesMapInner({
  branches,
  zoomButtonsOnly = false,
}: Props) {
  const viewKey = useMemo(() => branchesViewKey(branches), [branches]);
  const initialCenter: [number, number] =
    branches.length > 0
      ? [branches[0].location.lat, branches[0].location.lng]
      : DEFAULT_CENTER;

  return (
    <div className="eshop-branches-map relative z-0 h-64 overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={!zoomButtonsOnly}
        doubleClickZoom={!zoomButtonsOnly}
        touchZoom={!zoomButtonsOnly}
        boxZoom={!zoomButtonsOnly}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url={CARTO_LIGHT_TILES} subdomains="abcd" maxZoom={20} />
        <FitMapView branches={branches} viewKey={viewKey} />
        {branches.map((branch) => (
          <Marker key={branch.id} position={[branch.location.lat, branch.location.lng]}>
            <Popup>
              <strong>{branch.name}</strong>
              {branch.address ? (
                <>
                  <br />
                  <span className="text-muted-foreground">{branch.address}</span>
                </>
              ) : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
