export {
  buildTedStamp,
  extractCafSigningMaterial,
  signTedDd,
  type BuildTedInput,
  type CafSigningMaterial,
} from '@kai/fiscal-ted';
import { buildTedStamp } from '@kai/fiscal-ted';
import type { SetBeCase } from './set-be.constants';
import { sumCaseTotals } from './set-be.constants';

function isoTimestamp(): string {
  return new Date().toISOString().slice(0, 19);
}

export function buildTedStampForSetBeCase(
  emisorRut: string,
  caso: SetBeCase,
  folio: number,
  cafXml: string,
  issuedAt?: string,
): { tedXml: string; tmstFirma: string } {
  const totals = sumCaseTotals(caso.lines);
  const fecha = issuedAt ?? new Date().toISOString().slice(0, 10);
  const tmstFirma = isoTimestamp();
  const tedXml = buildTedStamp({
    rutEmisor: emisorRut,
    tipoDte: 39,
    folio,
    fechaEmision: fecha,
    rutReceptor: '66666666-6',
    razonSocialReceptor: 'Cliente Certificacion',
    mntTotal: totals.mntTotal,
    primerItem: caso.lines[0]?.name ?? 'Item',
    cafXml,
    timestamp: tmstFirma,
  });
  return { tedXml, tmstFirma };
}
