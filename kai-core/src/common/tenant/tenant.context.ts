import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextStore {
  userId: string | null;
  activeCompanyId: string | null;
  rol: string | null;
}

/**
 * Continuation Local Storage para propagar el contexto de tenant a través
 * de la cadena async (services, queries, subscribers TypeORM).
 *
 * Se popula en TenantGuard y se consume en TypeORM subscribers + services
 * que necesiten `companyId` sin recibirlo por parámetro explícito.
 */
class TenantContextHolder {
  private readonly als = new AsyncLocalStorage<TenantContextStore>();

  run<T>(store: TenantContextStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): TenantContextStore | null {
    return this.als.getStore() ?? null;
  }

  getCompanyId(): string | null {
    return this.get()?.activeCompanyId ?? null;
  }

  getUserId(): string | null {
    return this.get()?.userId ?? null;
  }

  getRol(): string | null {
    return this.get()?.rol ?? null;
  }
}

export const TenantContext = new TenantContextHolder();
