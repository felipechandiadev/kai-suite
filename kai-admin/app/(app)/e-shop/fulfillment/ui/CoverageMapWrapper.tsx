"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@kai/ui";
import type { MauleCommunesFeatureCollection } from "@/features/e-shop-delivery/types/delivery.types";

const CoverageMap = dynamic(() => import("./CoverageMap"), {
  ssr: false,
  loading: () => (
    <LoadingState
      className="flex h-full items-center justify-center rounded-xl border border-border"
      label="Cargando mapa de cobertura"
    />
  ),
});

type Props = {
  communesGeoJson: MauleCommunesFeatureCollection;
  enabledCodes: Set<string>;
  selectedCode: string | null;
  onSelect: (code: string) => void;
};

export function CoverageMapWrapper(props: Props) {
  return <CoverageMap {...props} />;
}
