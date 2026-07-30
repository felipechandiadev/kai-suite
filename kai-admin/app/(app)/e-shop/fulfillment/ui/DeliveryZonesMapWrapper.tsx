"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import { LoadingState } from "@kai/ui";
import type {
  DeliveryZoneRow,
  GeoJsonPolygon,
  MauleCommunesFeatureCollection,
} from "@/features/e-shop-delivery/types/delivery.types";
import type { DeliveryZonesMapHandle } from "./DeliveryZonesMap";

const DeliveryZonesMap = dynamic(() => import("./DeliveryZonesMap"), {
  ssr: false,
  loading: () => (
    <LoadingState
      className="flex h-full items-center justify-center rounded-xl border border-border"
      label="Cargando mapa de zonas"
    />
  ),
});

type Props = {
  zones: DeliveryZoneRow[];
  selectedZoneId: string | null;
  operationalGeoJson: MauleCommunesFeatureCollection | null;
  onDraftGeometryChange: (geometry: GeoJsonPolygon | null) => void;
};

export const DeliveryZonesMapWrapper = forwardRef<DeliveryZonesMapHandle, Props>(
  function DeliveryZonesMapWrapper(props, ref) {
    return <DeliveryZonesMap ref={ref} {...props} />;
  },
);
