export type CustomerDisplayStorageV1 = {
  enabled: boolean;
  host: string;
  port: number;
  useTls: boolean;
  token?: string;
};

export const CUSTOMER_DISPLAY_STORAGE_KEY = "flowstore.pos.customerDisplay.v1";

const DEFAULTS: CustomerDisplayStorageV1 = {
  enabled: false,
  host: "127.0.0.1",
  port: 14571,
  useTls: true,
};

export function readCustomerDisplayFromStorage(): CustomerDisplayStorageV1 {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(CUSTOMER_DISPLAY_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<CustomerDisplayStorageV1>;
    return {
      enabled: parsed.enabled === true,
      host: typeof parsed.host === "string" && parsed.host.trim() ? parsed.host.trim() : DEFAULTS.host,
      port:
        typeof parsed.port === "number" && parsed.port > 0 && parsed.port < 65536
          ? parsed.port
          : DEFAULTS.port,
      useTls: parsed.useTls !== false,
      token: typeof parsed.token === "string" ? parsed.token : undefined,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeCustomerDisplayToStorage(patch: Partial<CustomerDisplayStorageV1>): void {
  if (typeof window === "undefined") return;
  const prev = readCustomerDisplayFromStorage();
  window.localStorage.setItem(
    CUSTOMER_DISPLAY_STORAGE_KEY,
    JSON.stringify({ ...prev, ...patch }),
  );
}
