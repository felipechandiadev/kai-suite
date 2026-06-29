import {
  SET_BE_CASES,
  splitLineAmounts,
  sumCaseTotals,
  type SetBeCase,
} from '../domain/set-be.constants';

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

function buildDetalleLines(caso: SetBeCase, startNro: number): string {
  const lines: string[] = [];
  let nro = startNro;
  for (const line of caso.lines) {
    const amounts = splitLineAmounts(
      line.quantity,
      line.unitPriceWithIva,
      !!line.exempt,
    );
    const indExe = line.exempt ? '<IndExe>1</IndExe>' : '';
    const unmd = line.unitMeasure
      ? `<UnmdItem>${line.unitMeasure}</UnmdItem>`
      : '<UnmdItem>UN</UnmdItem>';
    lines.push(`<Detalle>
<NroLinDet>${nro}</NroLinDet>
${indExe}
<NmbItem>${escapeXml(line.name)}</NmbItem>
${unmd}
<QtyItem>${line.quantity}</QtyItem>
<PrcItem>${line.unitPriceWithIva}</PrcItem>
<MontoItem>${amounts.lineTotal}</MontoItem>
</Detalle>`);
    nro += 1;
  }
  return lines.join('');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDteBoletaXml(
  emisor: EmisorData,
  caso: SetBeCase,
  folio: number,
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

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
<Documento ID="F${folio}T39">
<Encabezado>
<IdDoc>
<TipoDTE>39</TipoDTE>
<Folio>${folio}</Folio>
<FchEmis>${todayIso()}</FchEmis>
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
${buildDetalleLines(caso, 1)}
${refBlock}
${obsBlock}
</Documento>
</DTE>`;
}

export function buildEnvioBoletaXml(
  emisor: EmisorData,
  dteXmlList: string[],
): string {
  const rutEmisor = formatRut(emisor.rut);
  const [rutBody, rutDv] = rutEmisor.split('-');
  const dtes = dteXmlList
    .map((dte) => dte.replace(/^<\?xml[^>]*\?>\s*/i, ''))
    .join('\n');
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioBOLETA xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0" xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioBOLETA_v11.xsd">
<SetDTE ID="SetDoc">
<Caratula version="1.0">
<RutEmisor>${rutBody}-${rutDv}</RutEmisor>
<RutEnvia>${rutBody}-${rutDv}</RutEnvia>
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
): string {
  const rutEmisor = formatRut(emisor.rut);
  const [rutBody, rutDv] = rutEmisor.split('-');
  const count = folioTo - folioFrom + 1;
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<ConsumoFolios xmlns="http://www.sii.cl/SiiDte" version="1.0">
<DocumentoConsumoFolios ID="RCO_${folioFrom}_${folioTo}">
<Caratula version="1.0">
<RutEmisor>${rutBody}-${rutDv}</RutEmisor>
<RutEnvia>${rutBody}-${rutDv}</RutEnvia>
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
