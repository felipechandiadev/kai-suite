import {
  splitLineAmounts,
  sumCaseTotals,
  type SetBeCase,
} from '../domain/set-be.constants';
import { buildTedStamp, buildTedStampForSetBeCase } from '../domain/fiscal-caf-ted';
import type { SaleBoletaDocument } from '../domain/sale-boleta.types';

export type EmisorData = {
  rut: string;
  legalName: string;
  businessActivity: string;
  address: string;
  commune: string;
  city: string;
  resolutionNumber: string;
  resolutionDate: string;
};

function formatRut(rut: string): string {
  return rut.replace(/\./g, '').trim();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDetalleLines(
  lines: Array<{
    name: string;
    quantity: number;
    unitPriceWithIva: number;
    exempt?: boolean;
    unitMeasure?: string;
  }>,
  startNro: number,
): string {
  const result: string[] = [];
  let nro = startNro;
  for (const line of lines) {
    const amounts = splitLineAmounts(
      line.quantity,
      line.unitPriceWithIva,
      !!line.exempt,
    );
    const indExe = line.exempt ? '<IndExe>1</IndExe>' : '';
    const unmd = line.unitMeasure
      ? `<UnmdItem>${line.unitMeasure}</UnmdItem>`
      : '<UnmdItem>UN</UnmdItem>';
    result.push(`<Detalle>
<NroLinDet>${nro}</NroLinDet>
${indExe}
<NmbItem>${escapeXml(line.name)}</NmbItem>
<QtyItem>${line.quantity}</QtyItem>
${unmd}
<PrcItem>${line.unitPriceWithIva}</PrcItem>
<MontoItem>${amounts.lineTotal}</MontoItem>
</Detalle>`);
    nro += 1;
  }
  return result.join('');
}

function buildDetalleLinesFromCase(caso: SetBeCase, startNro: number): string {
  return buildDetalleLines(caso.lines, startNro);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type BuildDteBoletaOptions = {
  /** XML AUTORIZACION del CAF SII — habilita timbre TED real */
  cafXml?: string;
  /** YYYY-MM-DD; por defecto hoy */
  issuedAt?: string;
};

export function buildDteBoletaXml(
  emisor: EmisorData,
  caso: SetBeCase,
  folio: number,
  options?: BuildDteBoletaOptions,
): string {
  const totals = sumCaseTotals(caso.lines);
  const rutEmisor = formatRut(emisor.rut);
  const [rutBody, rutDv] = rutEmisor.split('-');
  const refBlock = `<Referencia>
<NroLinRef>1</NroLinRef>
<CodRef>SET</CodRef>
<RazonRef>${caso.reference}</RazonRef>
</Referencia>`;
  const obsBlock = caso.observation
    ? `<Observaciones>${escapeXml(caso.observation)}</Observaciones>`
    : '';
  const mntExeBlock =
    totals.mntExe > 0 ? `<MntExe>${totals.mntExe}</MntExe>` : '';
  const mntNetoBlock =
    totals.mntNeto > 0 ? `<MntNeto>${totals.mntNeto}</MntNeto>` : '';
  const ivaBlock = totals.iva > 0 ? `<IVA>${totals.iva}</IVA>` : '';
  const issuedAt = options?.issuedAt ?? todayIso();
  let tedBlock = '';
  let tmstFirmaBlock = '';
  if (options?.cafXml) {
    const { tedXml, tmstFirma } = buildTedStampForSetBeCase(
      emisor.rut,
      caso,
      folio,
      options.cafXml,
      issuedAt,
    );
    tedBlock = tedXml;
    tmstFirmaBlock = `<TmstFirma>${tmstFirma}</TmstFirma>`;
  }

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
<Documento ID="F${folio}T39">
<Encabezado>
<IdDoc>
<TipoDTE>39</TipoDTE>
<Folio>${folio}</Folio>
<FchEmis>${issuedAt}</FchEmis>
<IndServicio>3</IndServicio>
</IdDoc>
<Emisor>
<RUTEmisor>${rutBody}-${rutDv}</RUTEmisor>
<RznSocEmisor>${escapeXml(emisor.legalName)}</RznSocEmisor>
<GiroEmisor>${escapeXml(emisor.businessActivity)}</GiroEmisor>
<DirOrigen>${escapeXml(emisor.address)}</DirOrigen>
<CmnaOrigen>${escapeXml(emisor.commune)}</CmnaOrigen>
<CiudadOrigen>${escapeXml(emisor.city)}</CiudadOrigen>
</Emisor>
<Receptor>
<RUTRecep>66666666-6</RUTRecep>
<RznSocRecep>Cliente Certificacion</RznSocRecep>
</Receptor>
<Totales>
${mntNetoBlock}
${mntExeBlock}
${ivaBlock}
<MntTotal>${totals.mntTotal}</MntTotal>
</Totales>
</Encabezado>
${buildDetalleLinesFromCase(caso, 1)}
${refBlock}
${obsBlock}
${tedBlock}
${tmstFirmaBlock}
</Documento>
</DTE>`;
}

export function buildSaleDteBoletaXml(
  emisor: EmisorData,
  doc: SaleBoletaDocument,
  folio: number,
  options?: BuildDteBoletaOptions,
): { dteXml: string; tedXml: string; tmstFirma: string } {
  const totals = sumCaseTotals(doc.lines);
  const rutEmisor = formatRut(emisor.rut);
  const [rutBody, rutDv] = rutEmisor.split('-');
  const [recepBody, recepDv] = formatRut(doc.receptor.rut).split('-');
  const obsBlock = doc.observation
    ? `<Observaciones>${escapeXml(doc.observation)}</Observaciones>`
    : '';
  const mntExeBlock =
    totals.mntExe > 0 ? `<MntExe>${totals.mntExe}</MntExe>` : '';
  const mntNetoBlock =
    totals.mntNeto > 0 ? `<MntNeto>${totals.mntNeto}</MntNeto>` : '';
  const ivaBlock = totals.iva > 0 ? `<IVA>${totals.iva}</IVA>` : '';
  const issuedAt = options?.issuedAt ?? todayIso();
  if (!options?.cafXml) {
    throw new Error('CAF XML requerido para boleta de venta');
  }
  const tmstFirma = new Date().toISOString().slice(0, 19);
  const tedXml = buildTedStamp({
    rutEmisor: emisor.rut,
    tipoDte: 39,
    folio,
    fechaEmision: issuedAt,
    rutReceptor: doc.receptor.rut,
    razonSocialReceptor: doc.receptor.name,
    mntTotal: totals.mntTotal,
    primerItem: doc.lines[0]?.name ?? 'Item',
    cafXml: options.cafXml,
    timestamp: tmstFirma,
  });
  const dteXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
<Documento ID="F${folio}T39">
<Encabezado>
<IdDoc>
<TipoDTE>39</TipoDTE>
<Folio>${folio}</Folio>
<FchEmis>${issuedAt}</FchEmis>
<IndServicio>3</IndServicio>
</IdDoc>
<Emisor>
<RUTEmisor>${rutBody}-${rutDv}</RUTEmisor>
<RznSocEmisor>${escapeXml(emisor.legalName)}</RznSocEmisor>
<GiroEmisor>${escapeXml(emisor.businessActivity)}</GiroEmisor>
<DirOrigen>${escapeXml(emisor.address)}</DirOrigen>
<CmnaOrigen>${escapeXml(emisor.commune)}</CmnaOrigen>
<CiudadOrigen>${escapeXml(emisor.city)}</CiudadOrigen>
</Emisor>
<Receptor>
<RUTRecep>${recepBody}-${recepDv}</RUTRecep>
<RznSocRecep>${escapeXml(doc.receptor.name)}</RznSocRecep>
</Receptor>
<Totales>
${mntNetoBlock}
${mntExeBlock}
${ivaBlock}
<MntTotal>${totals.mntTotal}</MntTotal>
</Totales>
</Encabezado>
${buildDetalleLines(doc.lines, 1)}
${obsBlock}
${tedXml}
<TmstFirma>${tmstFirma}</TmstFirma>
</Documento>
</DTE>`;
  return { dteXml, tedXml, tmstFirma };
}

export function buildEnvioBoletaXml(
  emisor: EmisorData,
  dteXmlList: string[],
  rutEnvia?: string,
): string {
  const rutEmisor = formatRut(emisor.rut);
  const rutSender = formatRut(rutEnvia ?? emisor.rut);
  const [rutBody, rutDv] = rutEmisor.split('-');
  const [senderBody, senderDv] = rutSender.split('-');
  const dtes = dteXmlList
    .map((dte) => dte.replace(/^<\?xml[^>]*\?>\s*/i, ''))
    .join('\n');
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioBOLETA xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0" xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioBOLETA_v11.xsd">
<SetDTE ID="SetDoc">
<Caratula version="1.0">
<RutEmisor>${rutBody}-${rutDv}</RutEmisor>
<RutEnvia>${senderBody}-${senderDv}</RutEnvia>
<RutReceptor>60803000-K</RutReceptor>
<FchResol>${emisor.resolutionDate}</FchResol>
<NroResol>${emisor.resolutionNumber}</NroResol>
<TmstFirmaEnv>${new Date().toISOString().slice(0, 19)}</TmstFirmaEnv>
<SubTotDTE>
<TpoDTE>39</TpoDTE>
<NroDTE>${dteXmlList.length}</NroDTE>
</SubTotDTE>
</Caratula>
${dtes}
</SetDTE>
</EnvioBOLETA>`;
}

export function buildRcoCertificationXml(
  emisor: EmisorData,
  folioFrom: number,
  folioTo: number,
  rutEnvia?: string,
): string {
  const rutEmisor = formatRut(emisor.rut);
  const rutSender = formatRut(rutEnvia ?? emisor.rut);
  const [rutBody, rutDv] = rutEmisor.split('-');
  const [senderBody, senderDv] = rutSender.split('-');
  const count = folioTo - folioFrom + 1;
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<ConsumoFolios xmlns="http://www.sii.cl/SiiDte" version="1.0">
<DocumentoConsumoFolios ID="RCO_${folioFrom}_${folioTo}">
<Caratula version="1.0">
<RutEmisor>${rutBody}-${rutDv}</RutEmisor>
<RutEnvia>${senderBody}-${senderDv}</RutEnvia>
<FchResol>${emisor.resolutionDate}</FchResol>
<NroResol>${emisor.resolutionNumber}</NroResol>
<FchInicio>${todayIso()}</FchInicio>
<FchFinal>${todayIso()}</FchFinal>
<Correlativo>1</Correlativo>
<SecEnvio>1</SecEnvio>
<TmstFirmaEnv>${new Date().toISOString().slice(0, 19)}</TmstFirmaEnv>
</Caratula>
<Resumen>
<TipoDocumento>39</TipoDocumento>
<MntNeto>0</MntNeto>
<MntIva>0</MntIva>
<MntExento>0</MntExento>
<MntTotal>0</MntTotal>
<FoliosEmitidos>${count}</FoliosEmitidos>
<FoliosAnulados>0</FoliosAnulados>
<FoliosUtilizados>${count}</FoliosUtilizados>
</Resumen>
</DocumentoConsumoFolios>
</ConsumoFolios>`;
}
