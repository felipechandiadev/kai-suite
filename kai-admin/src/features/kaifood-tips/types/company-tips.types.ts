export type TipDistributionMode = "NONE" | "DIRECT" | "POOL" | "POINTS";

export type CompanyTipSettings = {
  enabled: boolean;
  suggestPercent: number;
  allowCustomAmount: boolean;
  allowCashTips: boolean;
  distributionMode: TipDistributionMode;
};

export function defaultCompanyTipSettings(): CompanyTipSettings {
  return {
    enabled: false,
    suggestPercent: 10,
    allowCustomAmount: true,
    allowCashTips: true,
    distributionMode: "NONE",
  };
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

/** Lee `settings.tips.enabled` del JSON de empresa. */
export function isCompanyTipsEnabledFromSettings(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  const tips = settings?.tips;
  if (tips == null || typeof tips !== "object" || Array.isArray(tips)) {
    return false;
  }
  return truthy((tips as Record<string, unknown>).enabled);
}
