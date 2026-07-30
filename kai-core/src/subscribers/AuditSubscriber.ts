import {
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { Audit } from '@modules/audits/domain/audit.entity';
import { AuditActionType } from '@modules/audits/domain/audit.types';

// Entidades a auditar (solo Person, User es auditado manualmente en las acciones)
const AUDITABLE_ENTITIES = ['Person'];

@EventSubscriber()
export class AuditSubscriber {
  private isAuditable(entity: any): boolean {
    const entityName = entity?.constructor?.name;
    return AUDITABLE_ENTITIES.includes(entityName);
  }

  private sanitizeEntity(entity: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    if (entity && typeof entity === 'object') {
      Object.keys(entity).forEach((key) => {
        if (
          !key.startsWith('_') &&
          !key.includes('Manager') &&
          !key.includes('Repository')
        ) {
          const value = entity[key];
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            sanitized[key] = value;
          }
        }
      });
    }
    return sanitized;
  }

  async afterInsert(event: InsertEvent<any>) {
    if (!this.isAuditable(event.entity)) return;

    try {
      const entityName = event.entity.constructor.name;

      const auditRepo = event.manager.getRepository<Audit>('Audit');
      await auditRepo.save(
        auditRepo.create({
          entityName,
          entityId: event.entity.id,
          userId: undefined,
          action: AuditActionType.CREATE,
          oldValues: undefined,
          newValues: this.sanitizeEntity(event.entity),
          changes: {
            fields: {},
            changedFields: [],
          },
        }),
      );
    } catch (error) {
      console.error('[AuditSubscriber] Error en afterInsert:', error);
    }
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (!event.entity || !this.isAuditable(event.entity)) return;

    try {
      const entityName = event.entity.constructor.name;

      const oldValues = event.databaseEntity
        ? this.sanitizeEntity(event.databaseEntity)
        : undefined;
      const newValues = event.entity
        ? this.sanitizeEntity(event.entity)
        : undefined;

      const changes = this.calculateChanges(oldValues, newValues);

      const auditRepo = event.manager.getRepository<Audit>('Audit');
      await auditRepo.save(
        auditRepo.create({
          entityName,
          entityId: event.entity.id,
          userId: undefined,
          action: AuditActionType.UPDATE,
          oldValues,
          newValues,
          changes,
        }),
      );
    } catch (error) {
      console.error('[AuditSubscriber] Error en afterUpdate:', error);
    }
  }

  async afterRemove(event: RemoveEvent<any>) {
    if (!this.isAuditable(event.entity)) return;

    try {
      const entityName = event.entity.constructor.name;
      const auditRepo = event.manager.getRepository<Audit>('Audit');
      await auditRepo.save(
        auditRepo.create({
          entityName,
          entityId: event.entity.id,
          userId: undefined,
          action: AuditActionType.DELETE,
          oldValues: this.sanitizeEntity(event.entity),
          newValues: undefined,
          changes: { fields: {}, changedFields: [] },
        }),
      );
    } catch (error) {
      console.error('[AuditSubscriber] Error en afterRemove:', error);
    }
  }

  private calculateChanges(
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ) {
    const fields: Record<string, { oldValue: any; newValue: any }> = {};
    const changedFields: string[] = [];

    if (!oldValues && newValues) {
      Object.entries(newValues).forEach(([key, value]) => {
        fields[key] = { oldValue: null, newValue: value };
        changedFields.push(key);
      });
    }

    if (oldValues && newValues) {
      const allKeys = new Set([
        ...Object.keys(oldValues),
        ...Object.keys(newValues),
      ]);
      allKeys.forEach((key) => {
        const oldValue = oldValues[key];
        const newValue = newValues[key];
        if (oldValue !== newValue) {
          fields[key] = { oldValue, newValue };
          changedFields.push(key);
        }
      });
    }

    return { fields, changedFields };
  }
}
