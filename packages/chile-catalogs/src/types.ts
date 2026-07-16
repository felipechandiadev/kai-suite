export type ChileRegion = {
  code: string;
  name: string;
};

export type ChileCommune = {
  communeCode: string;
  name: string;
  treasuryCode: string;
  regionCode: string;
};

/** `null` = marca SII "G" (elige el contribuyente). */
export type SiiEconomicActivity = {
  code: string;
  name: string;
  ivaAffected: boolean | null;
  category: 1 | 2 | null;
};

export type PersonEconomicActivityCategory = 'PRIMERA' | 'SEGUNDA';

export type PersonEconomicActivity = {
  code: string;
  name: string;
  category: PersonEconomicActivityCategory;
  ivaAffected: boolean;
  isActive: boolean;
};
