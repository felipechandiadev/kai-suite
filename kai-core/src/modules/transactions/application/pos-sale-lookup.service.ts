import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';

export type PosSaleForReturnLineDto = {
  id: string;
  lineNumber: number;
  productId: string | null;
  productVariantId: string | null;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  /** Cantidad vendida en esta línea. */
  quantity: number;
  /**
   * Cantidad aún devolvable para la variante (vendido − ya devuelto en otros SALE_RETURN).
   * Mismo valor en todas las líneas que comparten variante.
   */
  returnableQuantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unitOfMeasure: string | null;
};

export type PosSaleForReturnDto = {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  /** Tope por variante para devoluciones parciales acumuladas. */
  lineMaxReturnableQtyByVariantId: Record<string, number>;
  lines: PosSaleForReturnLineDto[];
};

const BLOCKED_STATUSES = new Set<string>([
  TransactionStatus.VOIDED,
  TransactionStatus.CANCELLED,
  TransactionStatus.DRAFT,
]);

@Injectable()
export class PosSaleLookupService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findSaleByDocumentNumber(
    companyId: string,
    documentNumber: string,
  ): Promise<PosSaleForReturnDto | null> {
    const folio = documentNumber?.trim();
    if (!folio) {
      throw new BadRequestException('Folio de venta requerido');
    }

    const tx = await this.transactionRepository.findOne({
      where: {
        companyId,
        documentNumber: folio,
        transactionType: TransactionType.SALE,
      },
      relations: [
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
        'customer',
        'customer.person',
        'branch',
        'pointOfSale',
      ],
    });

    if (!tx) return null;

    if (BLOCKED_STATUSES.has(String(tx.status))) {
      throw new BadRequestException(
        `La venta ${folio} no está disponible para devolución (estado: ${tx.status}).`,
      );
    }

    const lineMaxReturnableQtyByVariantId =
      await this.buildLineMaxReturnableQtyByVariantId(tx.id, tx.lines ?? []);

    return this.toPosDto(tx, lineMaxReturnableQtyByVariantId);
  }

  /**
   * Cantidad máxima devolvable por variante: vendido en la venta menos devoluciones previas.
   */
  private async buildLineMaxReturnableQtyByVariantId(
    saleId: string,
    saleLines: Array<{ productVariantId?: string | null; quantity?: number }>,
  ): Promise<Record<string, number>> {
    const soldByVariant = new Map<string, number>();
    for (const sl of saleLines) {
      const vid = sl.productVariantId?.trim();
      if (!vid) continue;
      const q = Number(sl.quantity) || 0;
      soldByVariant.set(vid, (soldByVariant.get(vid) ?? 0) + q);
    }

    const priorReturns = await this.transactionRepository.find({
      where: {
        relatedTransactionId: saleId,
        transactionType: TransactionType.SALE_RETURN,
      },
      relations: ['lines'],
    });

    const returnedByVariant = new Map<string, number>();
    for (const pr of priorReturns) {
      for (const rl of pr.lines ?? []) {
        const vid = rl.productVariantId?.trim();
        if (!vid) continue;
        const q = Number(rl.quantity) || 0;
        returnedByVariant.set(vid, (returnedByVariant.get(vid) ?? 0) + q);
      }
    }

    const out: Record<string, number> = {};
    for (const [vid, sold] of soldByVariant) {
      const already = returnedByVariant.get(vid) ?? 0;
      const remaining = Math.max(0, sold - already);
      if (remaining > 0) {
        out[vid] = remaining;
      }
    }
    return out;
  }

  private toPosDto(
    tx: Transaction,
    lineMaxReturnableQtyByVariantId: Record<string, number>,
  ): PosSaleForReturnDto {
    const customer = tx.customer as
      | {
          id?: string;
          person?: {
            firstName?: string;
            lastName?: string;
            documentNumber?: string;
          };
        }
      | undefined;

    const person = customer?.person;
    const customerName = person
      ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || null
      : null;
    const customerDocument =
      typeof person?.documentNumber === 'string' &&
      person.documentNumber.trim()
        ? person.documentNumber.trim()
        : null;

    const sortedLines = [...(tx.lines ?? [])].sort(
      (a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0),
    );
    const lines = sortedLines.map((line, index) => {
      const qty = Number(line.quantity) || 0;
      const vid = line.productVariantId?.trim() ?? '';
      const returnableQuantity = vid
        ? Math.max(0, Number(lineMaxReturnableQtyByVariantId[vid]) || 0)
        : 0;
      const taxRate =
        Number(line.taxRate) ||
        Number((line as { tax?: { rate?: number } }).tax?.rate) ||
        0;
      return {
        id: line.id,
        lineNumber: line.lineNumber ?? index + 1,
        productId: line.productId ?? null,
        productVariantId: line.productVariantId ?? null,
        productName: line.productName,
        productSku: line.productSku ?? null,
        variantName: line.variantName ?? null,
        quantity: qty,
        returnableQuantity,
        unitPrice: Number(line.unitPrice) || 0,
        discountAmount: Number(line.discountAmount) || 0,
        taxRate,
        taxAmount: Number(line.taxAmount) || 0,
        subtotal: Number(line.subtotal) || 0,
        total: Number(line.total) || 0,
        unitOfMeasure: line.unitOfMeasure ?? null,
      };
    });

    return {
      id: tx.id,
      documentNumber: tx.documentNumber,
      transactionType: tx.transactionType,
      status: tx.status,
      createdAt:
        tx.createdAt instanceof Date
          ? tx.createdAt.toISOString()
          : String(tx.createdAt ?? ''),
      subtotal: Number(tx.subtotal) || 0,
      taxAmount: Number(tx.taxAmount) || 0,
      discountAmount: Number(tx.discountAmount) || 0,
      total: Number(tx.total) || 0,
      customerId: customer?.id ?? tx.customerId ?? null,
      customerName,
      customerDocument,
      branchName: tx.branch?.name ?? null,
      pointOfSaleName: tx.pointOfSale?.name ?? null,
      lineMaxReturnableQtyByVariantId,
      lines,
    };
  }
}
