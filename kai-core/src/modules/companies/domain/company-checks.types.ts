/**
 * Configuración de cheques para una empresa.
 *
 * Se persiste dentro de `companies.settings` (columna JSON), clave
 * `checks`, junto al resto de ajustes de la empresa.
 *
 * - `enabled`: master switch. Si está en false, ninguna ruta de cheques
 *   (POS, gastos, cartera) está habilitada.
 * - `receiveChecks`: la empresa acepta cheques como pago entrante. Se
 *   refleja en el catálogo `paymentMethods` (entrada CHECK isActive).
 * - `issueChecks`: la empresa emite cheques en pagos a proveedores/gastos.
 * - `allowPostdatedReceived`: en cheques recibidos, permite `dueDate`
 *   (postdatados).
 * - `allowPostdatedIssued`: en cheques emitidos, permite `dueDate`.
 * - `defaultDepositBankAccountKey`: cuenta sugerida al depositar un
 *   cheque entrante.
 * - `defaultIssueBankAccountKey`: cuenta sobre la que se gira al emitir
 *   cheques salientes.
 *
 * Compatibilidad: si en JSON antiguo solo existe `allowPostdated`, se
 * interpreta como ambos flags cuando correspondan receive/issue.
 */
export interface CompanyCheckSettings {
  enabled: boolean;
  receiveChecks: boolean;
  issueChecks: boolean;
  allowPostdatedReceived: boolean;
  allowPostdatedIssued: boolean;
  defaultDepositBankAccountKey: string | null;
  defaultIssueBankAccountKey: string | null;
}

export function buildDefaultCompanyCheckSettings(): CompanyCheckSettings {
  return {
    enabled: false,
    receiveChecks: false,
    issueChecks: false,
    allowPostdatedReceived: false,
    allowPostdatedIssued: false,
    defaultDepositBankAccountKey: null,
    defaultIssueBankAccountKey: null,
  };
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Normaliza un payload arbitrario en `CompanyCheckSettings`. Mantiene
 * coerciones laxas (acepta `0/1`, `"true"/"false"`) para tolerar clientes
 * que no envíen tipos exactos.
 */
export function sanitizeCompanyCheckSettings(
  raw: unknown,
): CompanyCheckSettings {
  const r = (raw ?? {}) as Partial<CompanyCheckSettings> & {
    allowPostdated?: unknown;
    [k: string]: unknown;
  };
  const truthy = (v: unknown): boolean =>
    v === true || v === 1 || v === '1' || v === 'true';

  const enabled = truthy(r.enabled);
  const receiveChecks = enabled && truthy(r.receiveChecks);
  const issueChecks = enabled && truthy(r.issueChecks);

  const legacyPostdated =
    'allowPostdatedReceived' in r === false &&
    'allowPostdatedIssued' in r === false &&
    'allowPostdated' in r
      ? truthy(r.allowPostdated)
      : false;

  const allowPostdatedReceived =
    receiveChecks &&
    ('allowPostdatedReceived' in r
      ? truthy(r.allowPostdatedReceived)
      : legacyPostdated);

  const allowPostdatedIssued =
    issueChecks &&
    ('allowPostdatedIssued' in r
      ? truthy(r.allowPostdatedIssued)
      : legacyPostdated);

  return {
    enabled,
    receiveChecks,
    issueChecks,
    allowPostdatedReceived,
    allowPostdatedIssued,
    defaultDepositBankAccountKey: trimOrNull(r.defaultDepositBankAccountKey),
    defaultIssueBankAccountKey: trimOrNull(r.defaultIssueBankAccountKey),
  };
}
