import { Injectable } from '@nestjs/common';
import { buildStockUpdatedPayload } from '@modules/stock-realtime/stock-threshold-alert-payload.util';
import {
  resolveStockThresholds,
  stockAlertGroupKey,
  type ThresholdScope,
} from '@modules/stock-realtime/stock-threshold-resolution.util';
import type { StockAlertKind } from '@modules/stock-realtime/stock-realtime.types';
import {
  NotificationDomain,
  NotificationSeverity,
  NotificationSource,
  StockNotificationKind,
} from '../domain/notification.enums';
import { PublishNotificationCommand } from './dto/publish-notification.command';
import { AudienceResolverService } from './audience-resolver.service';
import {
  formatVariantAttributeValues,
  resolveStockProductName,
} from './stock-variant-display.util';

type VariantRow = {
  id?: string;
  sku?: string;
  minimumStock?: number;
  minimumStockEnabled?: boolean;
  maximumStock?: number;
  maximumStockEnabled?: boolean;
  reorderPoint?: number;
  reorderPointEnabled?: boolean;
  attributeValues?: Record<string, string> | null;
  product?: { name?: string | null };
};

type StockLevelRow = {
  storageId: string;
  productVariantId: string;
  physicalStock: unknown;
  availableStock: unknown;
  minimumStock?: number | null;
  minimumStockEnabled?: boolean | null;
  maximumStock?: number | null;
  maximumStockEnabled?: boolean | null;
  reorderPoint?: number | null;
  reorderPointEnabled?: boolean | null;
};

const KIND_MAP: Record<StockAlertKind, { kind: string; severity: NotificationSeverity }> = {
  below_minimum: {
    kind: StockNotificationKind.BELOW_MINIMUM,
    severity: NotificationSeverity.WARNING,
  },
  above_maximum: {
    kind: StockNotificationKind.ABOVE_MAXIMUM,
    severity: NotificationSeverity.WARNING,
  },
  reorder: {
    kind: StockNotificationKind.REORDER,
    severity: NotificationSeverity.INFO,
  },
};

@Injectable()
export class StockNotificationEvaluator {
  constructor(private readonly audienceResolver: AudienceResolverService) {}

  evaluate(params: {
    companyId: string;
    variant: VariantRow | null;
    stockLevel: StockLevelRow;
    transactionId?: string | null;
    storageName?: string | null;
    totalPhysicalStock?: number;
  }): PublishNotificationCommand[] {
    const stockPayload = buildStockUpdatedPayload(
      params.companyId,
      params.variant,
      params.stockLevel,
      params.transactionId,
      { totalPhysicalStock: params.totalPhysicalStock },
    );
    if (stockPayload.alerts.length === 0) {
      return [];
    }

    const productName = resolveStockProductName(params.variant);
    const variantAttributes = formatVariantAttributeValues(
      params.variant?.attributeValues,
    );
    const storageLabel = params.storageName?.trim() || 'Almacén';
    const scope: ThresholdScope =
      stockPayload.thresholdScope === 'storage' ? 'storage' : 'variant_total';
    const storagePhysical = Number(stockPayload.physicalStock);
    const totalPhysical = Number(
      stockPayload.totalPhysicalStock ?? stockPayload.physicalStock,
    );
    const resolved = resolveStockThresholds(
      params.variant,
      params.stockLevel,
      { totalPhysicalStock: totalPhysical },
    );
    const effMin = resolved.min;
    const effMax = resolved.max;
    const effReorder = resolved.reorder;

    const commands: PublishNotificationCommand[] = [];

    for (const alert of stockPayload.alerts) {
      const meta = KIND_MAP[alert];
      if (!meta) continue;

      const title = this.titleForKind(alert, productName, storageLabel, totalPhysical);
      const body = this.bodyForKind(
        alert,
        scope,
        storagePhysical,
        totalPhysical,
        effMin,
        effMax,
        effReorder,
        storageLabel,
        variantAttributes,
      );
      const groupKey = stockAlertGroupKey(
        params.companyId,
        params.stockLevel.productVariantId,
        params.stockLevel.storageId,
        meta.kind,
        scope,
      );

      const cmd = new PublishNotificationCommand();
      cmd.companyId = params.companyId;
      cmd.source = NotificationSource.AUTOMATION;
      cmd.domain = NotificationDomain.STOCK;
      cmd.kind = meta.kind;
      cmd.severity = meta.severity;
      cmd.title = title;
      cmd.body = body;
      cmd.payload = {
        ...stockPayload,
        alertKind: alert,
        productName,
        variantAttributes,
        attributeValues: params.variant?.attributeValues ?? {},
        storageName: params.storageName ?? null,
        thresholds: { min: effMin, max: effMax, reorder: effReorder },
        deepLink: `/inventory/stock`,
        variantId: params.stockLevel.productVariantId,
        storageId: params.stockLevel.storageId,
      };
      cmd.entityType = 'ProductVariant';
      cmd.entityId = params.stockLevel.productVariantId;
      cmd.groupKey = groupKey;
      cmd.audiences = this.audienceResolver.stockDefaultAudiences();
      commands.push(cmd);
    }

    return commands;
  }

  private titleForKind(
    kind: StockAlertKind,
    productName: string,
    storageLabel: string,
    physical: number,
  ): string {
    const qty = physical.toLocaleString('es-CL', { maximumFractionDigits: 3 });
    switch (kind) {
      case 'below_minimum':
        return `Stock bajo mínimo: ${productName}`;
      case 'above_maximum':
        return `Stock sobre máximo: ${productName}`;
      case 'reorder':
        return `Reposición sugerida: ${productName}`;
      default:
        return `Alerta de stock: ${productName} (${storageLabel}, ${qty})`;
    }
  }

  private bodyForKind(
    kind: StockAlertKind,
    scope: ThresholdScope,
    storagePhysical: number,
    totalPhysical: number,
    min: number,
    max: number,
    reorder: number,
    storageLabel: string,
    variantAttributes: string,
  ): string {
    const storageQty = storagePhysical.toLocaleString('es-CL', {
      maximumFractionDigits: 3,
    });
    const totalQty = totalPhysical.toLocaleString('es-CL', {
      maximumFractionDigits: 3,
    });
    const minStr = min.toLocaleString('es-CL', { maximumFractionDigits: 3 });
    const maxStr = max.toLocaleString('es-CL', { maximumFractionDigits: 3 });
    const reorderStr = reorder.toLocaleString('es-CL', {
      maximumFractionDigits: 3,
    });
    const attrsSuffix = variantAttributes ? ` · ${variantAttributes}` : '';

    if (scope === 'variant_total') {
      const storageNote = ` En ${storageLabel}: ${storageQty}${attrsSuffix}.`;
      switch (kind) {
        case 'below_minimum':
          return `Stock total ${totalQty} en todos los almacenes (mínimo ${minStr}).${storageNote}`;
        case 'above_maximum':
          return `Stock total ${totalQty} en todos los almacenes (máximo ${maxStr}).${storageNote}`;
        case 'reorder':
          return `Stock total ${totalQty} en todos los almacenes (punto de reposición ${reorderStr}).${storageNote}`;
        default:
          return `Stock total ${totalQty}.${storageNote}`;
      }
    }

    const where = ` en ${storageLabel}${attrsSuffix}`;
    switch (kind) {
      case 'below_minimum':
        return `Stock físico ${storageQty}${where} (mínimo ${minStr}).`;
      case 'above_maximum':
        return `Stock físico ${storageQty}${where} (máximo ${maxStr}).`;
      case 'reorder':
        return `Stock físico ${storageQty}${where} (punto de reposición ${reorderStr}).`;
      default:
        return `Stock físico ${storageQty}${where}.`;
    }
  }
}
