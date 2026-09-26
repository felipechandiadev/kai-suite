import { invoke } from "@tauri-apps/api/core";
import { getToken } from "./auth-token";
import { ApiError } from "./errors";

export type FetchOpts = RequestInit & { skipAuth?: boolean };

function parseInvokeError(raw: unknown): ApiError {
  const msg = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : String(raw);
  try {
    const parsed = JSON.parse(msg) as { code?: number; message?: string };
    if (parsed.message) return new ApiError(parsed.message, parsed.code ?? 500);
  } catch {
    /* plain string */
  }
  return new ApiError(msg || "Lite invoke error", 500);
}

/**
 * HTTP-shaped path → Tauri `invoke("lite_*")` (in-process sqlx; no sidecar).
 */
const PATH_TO_COMMAND: Record<string, string> = {
  "GET /lite/health": "lite_health",
  "POST /lite/login": "lite_auth_login",
  "POST /lite/auth/login": "lite_auth_login",
  "POST /lite/change-password": "lite_auth_change_password",
  "POST /lite/auth/change-password": "lite_auth_change_password",
  "POST /lite/seed": "lite_seed_run",
  "GET /lite/catalog": "lite_pos_catalog",
  "GET /lite/pos/catalog": "lite_pos_catalog",
  "POST /lite/sale": "lite_pos_sale",
  "POST /lite/pos/sale": "lite_pos_sale",
  "GET /lite/products": "lite_admin_products_list",
  "POST /lite/products": "lite_admin_products_create",
  "POST /lite/products/bulk": "lite_admin_products_bulk",
  "GET /lite/stock": "lite_admin_stock_list",
  "POST /lite/stock/adjust": "lite_admin_stock_adjust",
  "POST /lite/stock/delta": "lite_admin_stock_delta",
  "POST /lite/stock/transfer": "lite_admin_stock_transfer",
  "GET /lite/units": "lite_admin_units_list",
  "POST /lite/units": "lite_admin_units_create",
  "GET /lite/storages": "lite_admin_storages_list",
  "POST /lite/storages": "lite_admin_storages_create",
  "GET /lite/categories": "lite_admin_categories_list",
  "POST /lite/categories": "lite_admin_categories_create",
  "GET /lite/attributes": "lite_admin_attributes_list",
  "POST /lite/attributes": "lite_admin_attributes_create",
  "GET /lite/customers": "lite_admin_customers_list",
  "GET /lite/suppliers": "lite_admin_suppliers_list",
  "GET /lite/sales": "lite_admin_sales_list",
  "GET /lite/receptions": "lite_admin_receptions_list",
  "POST /lite/receptions": "lite_admin_receptions_create",
  "GET /lite/purchasing/receptions": "lite_admin_receptions_list",
  "POST /lite/purchasing/receptions": "lite_admin_receptions_create",
  "GET /lite/dashboard": "lite_admin_dashboard",
  "GET /lite/company": "lite_admin_company_get",
  "PATCH /lite/company": "lite_admin_company_patch",
  "GET /lite/points-of-sale": "lite_admin_pos_list",
  "GET /lite/points-of-sale/current": "lite_admin_pos_current_get",
  "PATCH /lite/points-of-sale/current": "lite_admin_pos_current_patch",
  "GET /lite/cash-sessions": "lite_ops_cash_list",
  "POST /lite/cash-sessions": "lite_ops_cash_open",
  "GET /lite/users": "lite_admin_users_list",
  "POST /lite/users": "lite_admin_users_create",
};

type RouteMatch = {
  command: string;
  params: Record<string, string>;
};

function matchRoute(method: string, path: string): RouteMatch | null {
  const clean = path.split("?")[0] ?? path;
  const key = `${method.toUpperCase()} ${clean}`;
  if (PATH_TO_COMMAND[key]) {
    return { command: PATH_TO_COMMAND[key], params: {} };
  }

  let m = clean.match(/^\/lite\/products\/([^/]+)$/);
  if (method === "PATCH" && m) {
    return { command: "lite_admin_products_patch", params: { productId: m[1] } };
  }
  m = clean.match(/^\/lite\/products\/([^/]+)\/variants$/);
  if (method === "GET" && m) {
    return { command: "lite_admin_variants_list", params: { productId: m[1] } };
  }
  if (method === "POST" && m) {
    return { command: "lite_admin_variants_create", params: { productId: m[1] } };
  }
  m = clean.match(/^\/lite\/variants\/([^/]+)$/);
  if (method === "GET" && m) {
    return { command: "lite_admin_variant_get", params: { variantId: m[1] } };
  }
  if (method === "PATCH" && m) {
    return { command: "lite_admin_variant_patch", params: { variantId: m[1] } };
  }
  m = clean.match(/^\/lite\/variants\/([^/]+)\/pack$/);
  if (method === "GET" && m) {
    return { command: "lite_admin_pack_get", params: { variantId: m[1] } };
  }
  if (method === "PUT" && m) {
    return { command: "lite_admin_pack_put", params: { variantId: m[1] } };
  }
  m = clean.match(/^\/lite\/units\/([^/]+)$/);
  if (method === "PATCH" && m) {
    return { command: "lite_admin_units_patch", params: { id: m[1] } };
  }
  m = clean.match(/^\/lite\/storages\/([^/]+)$/);
  if (method === "PATCH" && m) {
    return { command: "lite_admin_storages_patch", params: { id: m[1] } };
  }
  m = clean.match(/^\/lite\/categories\/([^/]+)$/);
  if (method === "PATCH" && m) {
    return { command: "lite_admin_categories_patch", params: { id: m[1] } };
  }
  if (method === "DELETE" && m) {
    return { command: "lite_admin_categories_delete", params: { id: m[1] } };
  }
  m = clean.match(/^\/lite\/attributes\/([^/]+)$/);
  if (method === "PATCH" && m) {
    return { command: "lite_admin_attributes_patch", params: { id: m[1] } };
  }
  if (method === "DELETE" && m) {
    return { command: "lite_admin_attributes_delete", params: { id: m[1] } };
  }
  m = clean.match(/^\/lite\/sales\/([^/]+)$/);
  if (method === "GET" && m) {
    return { command: "lite_admin_sales_get", params: { saleId: m[1] } };
  }
  m = clean.match(/^\/lite\/sales\/([^/]+)\/void$/);
  if (method === "POST" && m) {
    return { command: "lite_admin_sales_void", params: { saleId: m[1] } };
  }
  m = clean.match(/^\/lite\/cash-sessions\/([^/]+)\/movements$/);
  if (method === "GET" && m) {
    return { command: "lite_ops_cash_movements", params: { sessionId: m[1] } };
  }
  m = clean.match(/^\/lite\/cash-sessions\/([^/]+)\/close-summary$/);
  if (method === "GET" && m) {
    return { command: "lite_ops_cash_close_summary", params: { sessionId: m[1] } };
  }
  m = clean.match(/^\/lite\/cash-sessions\/([^/]+)\/close$/);
  if (method === "POST" && m) {
    return { command: "lite_ops_cash_close", params: { sessionId: m[1] } };
  }
  m = clean.match(/^\/lite\/cash-sessions\/([^/]+)\/deposit$/);
  if (method === "POST" && m) {
    return { command: "lite_ops_cash_deposit", params: { sessionId: m[1] } };
  }
  m = clean.match(/^\/lite\/cash-sessions\/([^/]+)\/withdrawal$/);
  if (method === "POST" && m) {
    return { command: "lite_ops_cash_withdrawal", params: { sessionId: m[1] } };
  }
  m = clean.match(/^\/lite\/users\/([^/]+)$/);
  if (method === "DELETE" && m) {
    return { command: "lite_admin_users_delete", params: { userId: m[1] } };
  }
  m = clean.match(/^\/sales-reports\/([^/]+)\/run$/);
  if (method === "POST" && m) {
    return { command: "lite_sales_report_run", params: { reportId: m[1] } };
  }
  return null;
}

function parseBody(opts: FetchOpts): unknown {
  if (opts.body == null || opts.body === "") return undefined;
  if (typeof opts.body === "string") {
    try {
      return JSON.parse(opts.body);
    } catch {
      return opts.body;
    }
  }
  return opts.body;
}

function parseQueryArgs(path: string): Record<string, unknown> {
  const qi = path.indexOf("?");
  if (qi < 0) return {};
  const qs = new URLSearchParams(path.slice(qi + 1));
  const out: Record<string, unknown> = {};
  const q = qs.get("q");
  if (q != null && q !== "") out.q = q;
  const page = qs.get("page");
  if (page != null) {
    const n = Number(page);
    if (Number.isFinite(n)) out.page = n;
  }
  const pageSize = qs.get("pageSize");
  if (pageSize != null) {
    const n = Number(pageSize);
    if (Number.isFinite(n)) out.pageSize = n;
  }
  return out;
}

async function rustInvoke<T>(method: string, path: string, opts: FetchOpts): Promise<T> {
  const matched = matchRoute(method, path);
  if (!matched) {
    throw new ApiError(`No rust mapping for ${method} ${path}`, 501);
  }
  const args: Record<string, unknown> = {};
  const needsBearer = !["lite_health", "lite_auth_login", "lite_seed_run"].includes(
    matched.command,
  );
  if (needsBearer) {
    args.bearer = opts.skipAuth ? null : getToken();
  }

  const payload = parseBody(opts);
  if (matched.params.productId) args.productId = matched.params.productId;
  if (matched.params.variantId) args.variantId = matched.params.variantId;
  if (matched.params.saleId) args.saleId = matched.params.saleId;
  if (matched.params.sessionId) args.sessionId = matched.params.sessionId;
  if (matched.params.userId) args.userId = matched.params.userId;
  if (matched.params.id) args.id = matched.params.id;
  if (matched.params.reportId) args.reportId = matched.params.reportId;

  if (matched.command === "lite_pos_catalog") {
    Object.assign(args, parseQueryArgs(path));
  }

  if (payload !== undefined) {
    args.payload = payload;
  }

  try {
    return await invoke<T>(matched.command, args);
  } catch (e) {
    throw parseInvokeError(e);
  }
}

/**
 * Lite API: always Tauri invoke → sqlx (no HTTP / Node sidecar).
 */
export async function liteFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  return rustInvoke<T>(method, path, opts);
}
