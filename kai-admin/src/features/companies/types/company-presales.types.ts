export type CompanyPresaleSettings = {
  enabled: boolean;
};

export function defaultCompanyPresaleSettings(): CompanyPresaleSettings {
  return { enabled: false };
}
