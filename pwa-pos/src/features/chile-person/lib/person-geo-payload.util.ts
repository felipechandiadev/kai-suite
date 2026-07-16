import type { PersonEconomicActivity } from "@kai/chile-catalogs";
import type { ChileGeoValue } from "../ui/ChileRegionCommuneFields";

export function emptyChileGeoValue(): ChileGeoValue {
  return {
    regionCode: null,
    regionName: null,
    communeCode: null,
    communeName: null,
    treasuryCode: null,
    address: "",
  };
}

export function chileGeoFromPersonFields(input: {
  regionCode?: string | null;
  regionName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  treasuryCode?: string | null;
  address?: string | null;
}): ChileGeoValue {
  return {
    regionCode: input.regionCode?.trim() || null,
    regionName: input.regionName?.trim() || null,
    communeCode: input.communeCode?.trim() || null,
    communeName: input.communeName?.trim() || null,
    treasuryCode: input.treasuryCode?.trim() || null,
    address: input.address?.trim() ?? "",
  };
}

export type PersonGeoApiPayload = {
  regionCode?: string | null;
  regionName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  treasuryCode?: string | null;
  activityStarted?: boolean;
  address?: string;
  economicActivities?: PersonEconomicActivity[] | null;
};

export function activityStartedFromPerson(input: {
  activityStarted?: boolean | null;
  economicActivities?: PersonEconomicActivity[] | null;
}): boolean {
  if (input.activityStarted === true) return true;
  if (input.activityStarted === false) return false;
  return (input.economicActivities?.length ?? 0) > 0;
}

export function geoPayloadFromChileGeo(geo: ChileGeoValue): Pick<
  PersonGeoApiPayload,
  "regionCode" | "regionName" | "communeCode" | "communeName" | "treasuryCode" | "address"
> {
  const hasRegion = Boolean(geo.regionCode?.trim());
  const hasCommune = Boolean(geo.communeCode?.trim());
  return {
    regionCode: hasRegion ? geo.regionCode : null,
    regionName: hasRegion ? geo.regionName : null,
    communeCode: hasCommune ? geo.communeCode : null,
    communeName: hasCommune ? geo.communeName : null,
    treasuryCode: hasCommune ? geo.treasuryCode : null,
    address: geo.address.trim() || undefined,
  };
}
