import { companyToEmisorPreview, isEmisorCompleteFromCompany } from './fiscal-emisor-from-company';
import type { Company } from '@modules/companies/domain/company.entity';
import {
  splitLineAmounts,
  sumCaseTotals,
} from './set-be.constants';
import type { FiscalBoletaPrintPreview, FiscalBoletaPrintPreviewLine } from './fiscal-boleta-print-preview';
import type { SaleBoletaDocument } from './sale-boleta.types';

export function buildSaleBoletaPrintPreview(params: {
  company: Company;
  doc: SaleBoletaDocument;
  folio: number;
  issuedAt: string;
  tedXml: string;
  transactionDocumentNumber?: string | null;
}): FiscalBoletaPrintPreview {
  const emisor = companyToEmisorPreview(params.company);
  const totals = sumCaseTotals(params.doc.lines);
  const lines: FiscalBoletaPrintPreviewLine[] = params.doc.lines.map((line) => {
    const amounts = splitLineAmounts(line.quantity, line.unitPriceWithIva, !!line.exempt);
    return {
      name: line.name,
      quantity: line.quantity,
      unitPriceWithIva: line.unitPriceWithIva,
      exempt: !!line.exempt,
      unitMeasure: line.unitMeasure ?? null,
      lineNet: amounts.lineNet,
      lineExe: amounts.lineExe,
      lineIva: amounts.lineIva,
      lineTotal: amounts.lineTotal,
    };
  });

  return {
    caso: params.transactionDocumentNumber?.trim() || 'VENTA-POS',
    folio: params.folio,
    issuedAt: params.issuedAt,
    tipoDte: 39,
    isSimulated: false,
    timbrePdf417Payload: params.tedXml,
    emisor,
    emisorComplete: isEmisorCompleteFromCompany(params.company),
    receptor: { ...params.doc.receptor },
    lines,
    totals,
    observation: params.doc.observation ?? null,
    cafAdvisory: {
      hasActiveCaf: true,
      nextFolio: null,
      sufficientForSet: true,
    },
  };
}
