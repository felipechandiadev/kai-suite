"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EShopBranch } from "@/features/e-shop-storefront/types/storefront.types";

const EShopBranchesMapInner = dynamic(() => import("./EShopBranchesMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="h-64 animate-pulse rounded-xl border border-border bg-muted/30"
      aria-hidden
    />
  ),
});

type Props = {
  branches: EShopBranch[];
  /** En home: zoom solo con botones +/- del mapa. */
  zoomButtonsOnly?: boolean;
};

type BranchWithLocation = EShopBranch & { location: { lat: number; lng: number } };

function hasLocation(branch: EShopBranch): branch is BranchWithLocation {
  return branch.location?.lat != null && branch.location?.lng != null;
}

export function BranchesMap({ branches, zoomButtonsOnly = false }: Props) {
  const withLoc = useMemo(() => branches.filter(hasLocation), [branches]);
  const mapHostRef = useRef<HTMLDivElement>(null);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    const host = mapHostRef.current;
    if (!host || withLoc.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [withLoc.length]);

  if (withLoc.length === 0) {
    return (
      <ul className="space-y-2 text-xs text-muted-foreground md:text-sm">
        {branches.map((b) => (
          <li key={b.id}>
            <strong className="text-foreground">{b.name}</strong>
            {b.address ? ` — ${b.address}` : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={mapHostRef}>
        {mapVisible ? (
          <EShopBranchesMapInner branches={withLoc} zoomButtonsOnly={zoomButtonsOnly} />
        ) : (
          <div
            className="h-64 animate-pulse rounded-xl border border-border bg-muted/30"
            aria-hidden
          />
        )}
      </div>
      <ul className="space-y-2 text-xs md:text-sm">
        {branches.map((b) => (
          <li key={b.id}>
            <strong>{b.name}</strong>
            {b.address ? ` — ${b.address}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
