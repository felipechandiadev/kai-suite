import { BaseCommand } from '@shared/cqrs';

export class LoginCommand extends BaseCommand {
  constructor(
    public readonly userName: string,
    public readonly password: string,
    /**
     * Empresa solicitada por el cliente al hacer login (header X-Active-Company-Id).
     */
    public readonly companyHint?: string | null,
    /** Pedir modo Multiempresa (solo ADMIN/SUPER_ADMIN con ≥2 empresas). */
    public readonly multiCompanyMode?: boolean,
    /** App que inicia sesión (header X-Kai-App) para gate de matriz. */
    public readonly kaiApp?: string | null,
  ) {
    super();
  }
}
