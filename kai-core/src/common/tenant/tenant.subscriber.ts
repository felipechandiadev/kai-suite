import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { TenantContext } from './tenant.context';

/**
 * Auto-set `companyId` en cualquier INSERT cuando:
 *   - la entidad tiene una columna `companyId`,
 *   - el valor no fue ya provisto por el caller,
 *   - hay un activeCompanyId en TenantContext (ALS).
 *
 * Esto evita tener que pasar `companyId` explícitamente en todos los services
 * existentes. Las queries de SELECT no se filtran automáticamente — eso queda
 * a discreción de cada controller (con @CurrentCompany()).
 */
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>): void | Promise<any> {
    const entity = event.entity;
    if (!entity || typeof entity !== 'object') return;

    // Si la entidad no declara la columna companyId, salir.
    const hasCompanyIdColumn = event.metadata.columns.some(
      (c) =>
        c.propertyName === 'companyId' ||
        c.databaseName === 'company_id' ||
        c.databaseName === 'companyId',
    );
    if (!hasCompanyIdColumn) return;

    // Si el caller seteó la propiedad explícitamente (incluso `null`),
    // respetar su intención: NO sobrescribir. Esto permite crear
    // entidades globales (p. ej. usuarios ADMIN sin empresa) o saltar
    // el auto-fill puntualmente.
    if ('companyId' in entity) return;

    const fromCtx = TenantContext.getCompanyId();
    if (fromCtx) {
      (entity as any).companyId = fromCtx;
    }
  }
}
