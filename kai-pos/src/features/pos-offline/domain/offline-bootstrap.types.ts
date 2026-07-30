export type OfflineBootstrapStatus = {
  fiscal: "idle" | "loading" | "ok" | "error";
  catalog: "idle" | "loading" | "ok" | "error";
  customers: "idle" | "loading" | "ok" | "error";
  fiscalMessage?: string;
  catalogMessage?: string;
  customersMessage?: string;
  catalogTotal?: number;
  customersTotal?: number;
};
