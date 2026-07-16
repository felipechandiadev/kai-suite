import type {
  ChileCommune,
  ChileRegion,
  PersonEconomicActivity,
  PersonEconomicActivityCategory,
  SiiEconomicActivity,
} from './types';

export type {
  ChileCommune,
  ChileRegion,
  PersonEconomicActivity,
  PersonEconomicActivityCategory,
  SiiEconomicActivity,
};
import communesJson from '../data/communes.json';
import regionsJson from '../data/regions.json';
import activitiesJson from '../data/economic-activities.json';

const communes = communesJson as ChileCommune[];
const regions = regionsJson as ChileRegion[];
const activities = activitiesJson as SiiEconomicActivity[];

const activityByCode = new Map(activities.map((a) => [a.code, a]));
const communeByCode = new Map(communes.map((c) => [c.communeCode, c]));
const regionByCode = new Map(regions.map((r) => [r.code, r]));

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function listRegions(): ChileRegion[] {
  return regions;
}

export function getRegionByCode(code: string): ChileRegion | undefined {
  return regionByCode.get(code);
}

export function listCommunesByRegion(regionCode: string): ChileCommune[] {
  const rc = regionCode.trim();
  return communes.filter((c) => c.regionCode === rc);
}

export function getCommuneByCode(code: string): ChileCommune | undefined {
  return communeByCode.get(code.padStart(5, '0'));
}

export function searchCommunes(
  query: string,
  regionCode?: string | null,
): ChileCommune[] {
  const q = normalizeQuery(query);
  let list = regionCode
    ? listCommunesByRegion(regionCode)
    : communes;
  if (!q) return list.slice(0, 50);
  return list
    .filter((c) => {
      const hay = normalizeQuery(`${c.communeCode} ${c.name}`);
      return hay.includes(q);
    })
    .slice(0, 50);
}

export function listEconomicActivities(): SiiEconomicActivity[] {
  return activities;
}

export function getActivityByCode(code: string): SiiEconomicActivity | undefined {
  return activityByCode.get(code.trim());
}

export function searchEconomicActivities(query: string): SiiEconomicActivity[] {
  const q = normalizeQuery(query);
  if (!q) return activities.slice(0, 40);
  return activities
    .filter((a) => {
      const hay = normalizeQuery(`${a.code} ${a.name}`);
      return hay.includes(q);
    })
    .slice(0, 40);
}

/** Asegura a lo sumo una actividad activa. */
export function normalizeActiveEconomicActivities(
  items: PersonEconomicActivity[],
): PersonEconomicActivity[] {
  let seenActive = false;
  return items.map((item) => {
    if (!item.isActive) return { ...item, isActive: false };
    if (seenActive) return { ...item, isActive: false };
    seenActive = true;
    return { ...item, isActive: true };
  });
}

export function countActiveEconomicActivities(
  items: PersonEconomicActivity[] | null | undefined,
): number {
  if (!items?.length) return 0;
  return items.filter((i) => i.isActive).length;
}

export function activityRequiresOverrides(code: string): boolean {
  const a = getActivityByCode(code);
  if (!a) return true;
  return a.category == null || a.ivaAffected == null;
}
