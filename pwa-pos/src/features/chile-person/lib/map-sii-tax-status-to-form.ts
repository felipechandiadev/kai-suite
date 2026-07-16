import {
  normalizeActiveEconomicActivities,
  type PersonEconomicActivity,
} from "@kai/chile-catalogs";
import type { SiiTaxStatusActivityView, SiiCompanyFormDraft, SiiTaxStatusView } from "../types/sii-tax-status.types";

export function buildPersonActivitiesFromSii(
  activities: SiiTaxStatusActivityView[],
  activeCode: string,
): PersonEconomicActivity[] {
  const mapped = activities.map((a) => ({
    code: a.code,
    name: a.name,
    category: a.category,
    ivaAffected: a.ivaAffected,
    isActive: a.code === activeCode,
  }));
  return normalizeActiveEconomicActivities(mapped);
}

export function buildCompanyFormDraftFromSii(
  data: SiiTaxStatusView,
  activeCode: string,
): SiiCompanyFormDraft {
  return {
    businessName: data.legalName.trim(),
    documentNumber: data.rut,
    activityStarted: data.activityStarted,
    economicActivities: data.activityStarted
      ? buildPersonActivitiesFromSii(data.economicActivities, activeCode)
      : [],
  };
}
