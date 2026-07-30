import { DataSource, EntityMetadata } from 'typeorm';
import { Audit } from '@modules/audits/domain/audit.entity';
import {
  AuditActionType,
  AuditChangeData,
} from '@modules/audits/domain/audit.types';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogPayload {
  entityName: string;
  entityId: string;
  userId?: string;
  action: AuditActionType;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export class AuditService {
  constructor(private dataSource: DataSource) {}

  /**
   * Calcula los cambios entre oldValues y newValues
   */
  private calculateChanges(
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ): AuditChangeData {
    const fields: AuditChangeData['fields'] = {};
    const changedFields: string[] = [];

    // Para CREATE
    if (!oldValues && newValues) {
      Object.entries(newValues).forEach(([key, value]) => {
        fields[key] = { oldValue: null, newValue: value };
        changedFields.push(key);
      });
    }

    // Para UPDATE
    if (oldValues && newValues) {
      const allKeys = new Set([
        ...Object.keys(oldValues),
        ...Object.keys(newValues),
      ]);
      allKeys.forEach((key) => {
        const oldValue = oldValues[key];
        const newValue = newValues[key];

        // Ignorar relaciones y campos internos de TypeORM
        if (this.shouldAuditField(key, oldValue, newValue)) {
          if (oldValue !== newValue) {
            fields[key] = { oldValue, newValue };
            changedFields.push(key);
          }
        }
      });
    }

    // Para DELETE
    if (oldValues && !newValues) {
      Object.entries(oldValues).forEach(([key, value]) => {
        if (this.shouldAuditField(key, value, undefined)) {
          fields[key] = { oldValue: value, newValue: null };
        }
      });
    }

    return {
      fields,
      changedFields: changedFields,
    };
  }

  /**
   * Determina si un campo debe ser auditado
   */
  private shouldAuditField(
    fieldName: string,
    oldValue: any,
    newValue: any,
  ): boolean {
    // Ignorar campos internos de TypeORM
    const ignoredFields = [
      'id',
      '__v',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'person',
    ];
    if (ignoredFields.includes(fieldName)) {
      return false;
    }

    // Ignorar objetos complejos (relaciones)
    if (
      typeof oldValue === 'object' &&
      oldValue !== null &&
      !(oldValue instanceof Date)
    ) {
      return false;
    }
    if (
      typeof newValue === 'object' &&
      newValue !== null &&
      !(newValue instanceof Date)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Genera una descripción legible del cambio
   */
  private generateDescription(
    action: AuditActionType,
    entityName: string,
    changes: AuditChangeData,
  ): string {
    const fieldsStr =
      changes.changedFields.length > 0
        ? changes.changedFields.join(', ')
        : 'sin cambios';

    switch (action) {
      case AuditActionType.CREATE:
        return `${entityName} creado`;
      case AuditActionType.UPDATE:
        return `${entityName} actualizado: ${fieldsStr}`;
      case AuditActionType.DELETE:
        return `${entityName} eliminado`;
      default:
        return `${entityName} modificado`;
    }
  }

  /**
   * Registra una auditoría en la base de datos
   */
  async logAudit(payload: AuditLogPayload): Promise<Audit> {
    const { entityName, entityId, userId, action, oldValues, newValues } =
      payload;

    const changes = this.calculateChanges(oldValues, newValues);
    const description = this.generateDescription(action, entityName, changes);

    const audit = new Audit();
    audit.id = uuidv4();
    audit.entityName = entityName;
    audit.entityId = entityId;
    audit.userId = userId;
    audit.action = action;
    audit.changes = changes;
    audit.oldValues = oldValues;
    audit.newValues = newValues;
    audit.description = description;

    const auditRepo = this.dataSource.getRepository<Audit>('Audit');
    return await auditRepo.save(audit);
  }

  /**
   * Obtiene auditorías por entidad
   */
  async getAuditsByEntity(
    entityName: string,
    entityId: string,
  ): Promise<Audit[]> {
    const auditRepo = this.dataSource.getRepository<Audit>('Audit');
    return await auditRepo.find({
      where: { entityName, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene auditorías por usuario
   */
  async getAuditsByUser(userId: string): Promise<Audit[]> {
    const auditRepo = this.dataSource.getRepository<Audit>('Audit');
    return await auditRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene todas las auditorías
   */
  async getAllAudits(
    limit: number = 100,
    offset: number = 0,
  ): Promise<Audit[]> {
    const auditRepo = this.dataSource.getRepository<Audit>('Audit');
    return await auditRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
