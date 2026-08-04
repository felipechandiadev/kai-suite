import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { CompanyDetail } from '@modules/companies/application/companies.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';
import type { PaymentSnapshot } from '../domain/payment-snapshot.types';
import type { TransactionBackorderMetadata } from '../domain/transaction-backorder.metadata';
import { getPaymentSnapshotsFromMetadata } from './payment-snapshots.util';
import type {
  PosSaleReceiptPrintDto,
  PosSaleReceiptPrintLineDto,
  PosSaleReceiptPrintPaymentDto,
  PosSaleReceiptPrintPromotionDto,
} from './pos-sale-receipt-print.types';

const REPRINTABLE_TYPES = new Set<string>([
  TransactionType.SALE,
  TransactionType.BACKORDER,
]);

const BLOCKED_STATUSES = new Set<string>([
  TransactionStatus.VOIDED,
  TransactionStatus.CANCELLED,
  TransactionStatus.DRAFT,
]);

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CUSTOMER_CREDIT_NOTE: 'Nota de crédito cliente',
  ORDER_ADVANCE: 'Abono por encargo',
};

@Injectable()
export class PosSaleReceiptPrintService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly companiesService: CompaniesService,
  ) {}

  async findReceiptByTransactionId(
    companyId: string,
    transactionId: string,
    options?: {
      scope?: 'full' | 'non_dte';
      /** Empresas a las que el usuario tiene membership (multiempresa). */
      allowedCompanyIds?: string[];
      isSuperAdmin?: boolean;
    },
  ): Promise<PosSaleReceiptPrintDto> {
    const id = transactionId?.trim();
    if (!id) {
      throw new BadRequestException('Transacción no especificada');
    }

    const relations = [
      'lines',
      'lines.product',
      'lines.productVariant',
      'lines.unit',
      'customer',
      'customer.person',
      'branch',
      'pointOfSale',
    ] as const;

    let tx = await this.transactionRepository.findOne({
      where: { id, companyId },
      relations: [...relations],
    });

    // Multiempresa: el header puede ser la company legacy mientras la venta
    // pertenece a otra empresa del membership (p. ej. admin Store+Food).
    if (!tx) {
      const candidate = await this.transactionRepository.findOne({
        where: { id },
        relations: [...relations],
      });
      if (candidate) {
        const allowedIds = options?.allowedCompanyIds ?? [];
        const allowed =
          options?.isSuperAdmin === true ||
          candidate.companyId === companyId ||
          allowedIds.includes(candidate.companyId);
        if (allowed) {
          tx = candidate;
        }
      }
    }

    if (!tx) {
      throw new NotFoundException('Transacción no encontrada');
    }

    const type = String(tx.transactionType ?? '');
    if (!REPRINTABLE_TYPES.has(type)) {
      throw new BadRequestException(
        'Solo se puede reimprimir comprobante de ventas o encargos',
      );
    }

    if (BLOCKED_STATUSES.has(String(tx.status))) {
      throw new BadRequestException(
        `El documento no está disponible para reimpresión (estado: ${tx.status})`,
      );
    }

    const company = await this.companiesService.getCompanyById(tx.companyId);
    return this.toReceiptDto(tx, company, options?.scope ?? 'full');
  }

  private toReceiptDto(
    tx: Transaction,
    company: CompanyDetail,
    scope: 'full' | 'non_dte' = 'full',
  ): PosSaleReceiptPrintDto {
    const meta =
      tx.metadata && typeof tx.metadata === 'object'
        ? (tx.metadata as Record<string, unknown>)
        : {};

    const isBackorder = tx.transactionType === TransactionType.BACKORDER;
    const documentKind: 'sale' | 'backorder' = isBackorder ? 'backorder' : 'sale';
    const salePrintPlan =
      typeof meta.salePrintPlan === 'string' ? meta.salePrintPlan : null;
    const lineRequiresDte =
      meta.lineRequiresDte && typeof meta.lineRequiresDte === 'object'
        ? (meta.lineRequiresDte as Record<string, boolean>)
        : {};

    const lines = this.mapLines(tx, scope, lineRequiresDte);
    const lineDiscounts = lines.reduce(
      (acc, l) => acc + (Number(l.discountAmount) || 0),
      0,
    );
    const discountTotal = Number(tx.discountAmount) || 0;
    const orderDiscount = Math.max(0, discountTotal - lineDiscounts);

    const subtotalNet = Number(tx.subtotal) || 0;
    const taxes = Number(tx.taxAmount) || 0;
    const subtotalGross = subtotalNet + taxes;
    const total = Number(tx.total) || 0;
    const paid = Number(tx.amountPaid) || total;
    const change = Number(tx.changeAmount) || 0;

    const backorderMeta = isBackorder
      ? this.mapBackorder(meta.backorder, total)
      : null;

    return {
      transactionId: tx.id,
      transactionType: String(tx.transactionType),
      folio: tx.documentNumber,
      issuedAtIso:
        tx.createdAt instanceof Date
          ? tx.createdAt.toISOString()
          : String(tx.createdAt ?? new Date().toISOString()),
      documentKind,
      backorder: backorderMeta,
      company: this.mapCompany(company),
      pos: {
        pointOfSaleName: tx.pointOfSale?.name ?? null,
        branchName: tx.branch?.name ?? null,
        priceListLabel: null,
      },
      customer: this.mapCustomer(tx),
      quotation: this.mapQuotation(meta.quotation),
      lines,
      promotions: this.mapPromotions(meta.promotionSnapshot),
      totals: {
        subtotalNet,
        subtotalGross,
        taxes,
        lineDiscounts,
        orderDiscount,
        discountsTotal: discountTotal,
        total,
        paid,
        change,
      },
      payments: this.mapPayments(
        getPaymentSnapshotsFromMetadata(meta),
        tx.paymentMethod,
        total,
        company,
      ),
      salePrintPlan:
        salePrintPlan === 'TICKET_ONLY' ||
        salePrintPlan === 'BOLETA_ONLY' ||
        salePrintPlan === 'BOLETA_AND_TICKET'
          ? salePrintPlan
          : null,
    };
  }

  private mapCompany(company: CompanyDetail): PosSaleReceiptPrintDto['company'] {
    const settings = company.settings ?? {};
    const logoUrl = this.extractLogoUrl(settings);
    return {
      razonSocial: company.razonSocial?.trim() || 'Empresa',
      nombreFantasia: company.nombreFantasia?.trim() || null,
      rut: company.rut?.trim() || null,
      businessActivity: company.businessActivity?.trim() || null,
      logoUrl,
      address: company.address?.trim() || null,
      mail: company.mail?.trim() || null,
      phone: company.phone?.trim() || null,
    };
  }

  private extractLogoUrl(settings: Record<string, unknown>): string | null {
    const pick = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : null;
    const direct =
      pick(settings.logoUrl) ??
      pick(settings.posLogoUrl) ??
      (() => {
        const brand = settings.brand;
        if (!brand || typeof brand !== 'object') return null;
        return pick((brand as Record<string, unknown>).logoUrl);
      })();
    return direct;
  }

  private mapCustomer(tx: Transaction): PosSaleReceiptPrintDto['customer'] {
    const customer = tx.customer as
      | {
          person?: {
            firstName?: string;
            lastName?: string;
            documentNumber?: string;
            phone?: string;
            email?: string;
          };
        }
      | undefined;
    const person = customer?.person;
    const name = person
      ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || null
      : null;
    const document =
      typeof person?.documentNumber === 'string' &&
      person.documentNumber.trim()
        ? person.documentNumber.trim()
        : null;
    const phone =
      typeof person?.phone === 'string' && person.phone.trim()
        ? person.phone.trim()
        : null;
    const email =
      typeof person?.email === 'string' && person.email.trim()
        ? person.email.trim()
        : null;
    if (!name && !document && !phone && !email) return null;
    return { name, document, phone, email };
  }

  private mapQuotation(raw: unknown): PosSaleReceiptPrintDto['quotation'] {
    if (!raw || typeof raw !== 'object') return null;
    const q = raw as Record<string, unknown>;
    const documentNumber =
      typeof q.documentNumber === 'string' && q.documentNumber.trim()
        ? q.documentNumber.trim()
        : null;
    const validUntil =
      typeof q.validUntil === 'string' && q.validUntil.trim()
        ? q.validUntil.trim()
        : null;
    if (!documentNumber) return null;
    return { documentNumber, validUntil };
  }

  private mapBackorder(
    raw: unknown,
    txTotal: number,
  ): PosSaleReceiptPrintDto['backorder'] {
    if (!raw || typeof raw !== 'object') {
      return {
        percent: 0,
        depositAmount: txTotal,
        orderTotal: txTotal,
      };
    }
    const b = raw as TransactionBackorderMetadata;
    const depositAmount = Number(b.depositAmount) || 0;
    const orderTotal = txTotal > depositAmount ? txTotal : depositAmount;
    const percent =
      Number(b.depositPercent) ||
      (orderTotal > 0 ? Math.round((depositAmount / orderTotal) * 100) : 0);
    return { percent, depositAmount, orderTotal };
  }

  private mapLines(
    tx: Transaction,
    scope: 'full' | 'non_dte' = 'full',
    lineRequiresDte: Record<string, boolean> = {},
  ): PosSaleReceiptPrintLineDto[] {
    const sorted = [...(tx.lines ?? [])].sort(
      (a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0),
    );
    const filtered =
      scope === 'non_dte'
        ? sorted.filter((line) => {
            const variantId = line.productVariantId?.trim() ?? '';
            if (!variantId) return false;
            return lineRequiresDte[variantId] === false;
          })
        : sorted;
    return filtered.map((line) => {
      const qty = Number(line.quantity) || 0;
      const lineTotal = Number(line.total) || 0;
      const unitPriceWithTax =
        qty > 0 ? lineTotal / qty : Number(line.unitPrice) || 0;
      const attrs: string[] = [];
      const vn = line.variantName?.trim();
      const pn = line.productName?.trim() ?? '';
      if (
        vn &&
        pn.localeCompare(vn, undefined, { sensitivity: 'accent' }) !== 0
      ) {
        attrs.push(vn);
      }
      const disc = Number(line.discountAmount) || 0;
      return {
        productName: line.productName,
        attributes: attrs,
        quantity: qty,
        unitSymbol: line.unitOfMeasure ?? null,
        unitPriceWithTax,
        lineGross: lineTotal,
        discountAmount: disc,
        discountLabel: disc > 0.01 ? 'Descuento' : null,
      };
    });
  }

  private mapPromotions(raw: unknown): PosSaleReceiptPrintPromotionDto[] {
    if (!Array.isArray(raw)) return [];
    const out: PosSaleReceiptPrintPromotionDto[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const code = String(o.promotionCode ?? o.code ?? '').trim();
      const name = String(o.promotionName ?? o.name ?? '').trim();
      const amount = Number(o.amountDiscounted ?? o.amount) || 0;
      if (!code && !name) continue;
      out.push({ code: code || '—', name: name || code, amount });
    }
    return out;
  }

  private mapPayments(
    snapshots: PaymentSnapshot[],
    legacyMethod: string | undefined,
    total: number,
    company: CompanyDetail,
  ): PosSaleReceiptPrintPaymentDto[] {
    if (snapshots.length > 0) {
      return snapshots.map((p) => ({
        label:
          p.alias?.trim() ||
          PAYMENT_LABELS[String(p.method)] ||
          String(p.method),
        amount: Number(p.amount) || 0,
        detail: this.paymentDetail(p, company),
      }));
    }
    const method = String(legacyMethod ?? '').trim();
    if (!method) return [];
    return [
      {
        label: PAYMENT_LABELS[method] ?? method,
        amount: total,
        detail: null,
      },
    ];
  }

  private paymentDetail(
    p: PaymentSnapshot,
    company: CompanyDetail,
  ): string | null {
    const bits: string[] = [];
    if (String(p.method) === 'TRANSFER' && p.bankAccountKey?.trim()) {
      const acc = company.bankAccounts?.find(
        (a) => (a.accountKey ?? '').trim() === p.bankAccountKey!.trim(),
      );
      if (acc) {
        bits.push(
          `${acc.bankName} · ${acc.accountType} · ${acc.accountNumber}`,
        );
      }
    }
    const cd = p.checkData;
    if (cd && typeof cd === 'object') {
      const o = cd as Record<string, unknown>;
      const parts = [
        typeof o.checkNumber === 'string' && o.checkNumber.trim()
          ? `N° ${o.checkNumber.trim()}`
          : '',
        typeof o.bankName === 'string' && o.bankName.trim() ? o.bankName.trim() : '',
        typeof o.drawerName === 'string' && o.drawerName.trim()
          ? `Librador: ${o.drawerName.trim()}`
          : '',
        typeof o.dueDate === 'string' && o.dueDate.trim()
          ? `Vence: ${o.dueDate.trim()}`
          : '',
      ].filter(Boolean);
      if (parts.length) bits.push(parts.join(' · '));
    }
    if (p.reference?.trim()) bits.push(`Ref: ${p.reference.trim()}`);
    return bits.length ? bits.join(' | ') : null;
  }
}
