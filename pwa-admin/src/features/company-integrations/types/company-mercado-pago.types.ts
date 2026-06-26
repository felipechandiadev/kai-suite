export type MercadoPagoEnvironment = "sandbox" | "production";

export type EshopDefaultPaymentMode = "online" | "coordinate";

export type CompanyMercadoPagoSettingsPublic = {
  enabled: boolean;
  environment: MercadoPagoEnvironment;
  publicKey: string;
  accessTokenConfigured: boolean;
  accessTokenMasked: string | null;
  pointTerminalId: string | null;
  posPointEnabled: boolean;
  eshopOnlinePaymentEnabled: boolean;
  eshopDefaultPaymentMode: EshopDefaultPaymentMode;
};

export function defaultCompanyMercadoPagoSettings(): CompanyMercadoPagoSettingsPublic {
  return {
    enabled: false,
    environment: "sandbox",
    publicKey: "",
    accessTokenConfigured: false,
    accessTokenMasked: null,
    pointTerminalId: null,
    posPointEnabled: false,
    eshopOnlinePaymentEnabled: false,
    eshopDefaultPaymentMode: "coordinate",
  };
}

export type CompanyMercadoPagoSettingsForm = CompanyMercadoPagoSettingsPublic & {
  accessToken: string;
};

export function toMercadoPagoForm(
  settings: CompanyMercadoPagoSettingsPublic,
): CompanyMercadoPagoSettingsForm {
  return {
    ...settings,
    accessToken: "",
  };
}
