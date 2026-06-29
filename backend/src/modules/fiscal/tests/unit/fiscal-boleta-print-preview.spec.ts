import {
  buildBoletaPrintPreview,
  folioForCaseIndex,
  isEmisorComplete,
  resolveSetBeCase,
} from '../../domain/fiscal-boleta-print-preview';

const emisorComplete = {
  rut: '76192083-9',
  legalName: 'Empresa Certificación',
  businessActivity: 'Servicios',
  address: 'Calle 1',
  commune: 'Santiago',
  city: 'Santiago',
  resolutionNumber: '80',
  resolutionDate: '2020-01-01',
};

const emisorPartial = {
  rut: '76192083-9',
  legalName: null,
  businessActivity: null,
  address: null,
  commune: null,
  city: null,
  resolutionNumber: null,
  resolutionDate: null,
};

describe('fiscal-boleta-print-preview', () => {
  it('resuelve CASO-1 por defecto', () => {
    const caso = resolveSetBeCase();
    expect(caso.id).toBe('CASO-1');
  });

  it('rechaza caso inválido', () => {
    expect(() => resolveSetBeCase('CASO-99')).toThrow('Caso inválido');
  });

  it('folio según índice del caso', () => {
    expect(folioForCaseIndex(42, 0)).toBe(42);
    expect(folioForCaseIndex(42, 3)).toBe(45);
  });

  it('emisor completo vs parcial', () => {
    expect(isEmisorComplete(emisorComplete)).toBe(true);
    expect(isEmisorComplete(emisorPartial)).toBe(false);
  });

  it('preview CASO-4 con totales mixtos', () => {
    const preview = buildBoletaPrintPreview({
      casoId: 'CASO-4',
      startFolio: 10,
      emisor: emisorComplete,
      cafAdvisory: { hasActiveCaf: true, nextFolio: 10, sufficientForSet: true },
      issuedAt: '2026-06-28',
    });
    expect(preview.caso).toBe('CASO-4');
    expect(preview.folio).toBe(13);
    expect(preview.totals.mntExe).toBe(2000);
    expect(preview.totals.mntTotal).toBe(14720);
    expect(preview.isSimulated).toBe(true);
    expect(preview.receptor.rut).toBe('66666666-6');
    expect(preview.timbrePdf417Payload).toContain('<TED version="1.0">');
    expect(preview.timbrePdf417Payload).toContain('<TD>39</TD>');
    expect(preview.lines).toHaveLength(2);
    expect(preview.lines[1].exempt).toBe(true);
    expect(preview.observation).toContain('exento');
  });

  it('preview sin CAF usa folio 1', () => {
    const preview = buildBoletaPrintPreview({
      casoId: 'CASO-2',
      startFolio: 1,
      emisor: emisorPartial,
      cafAdvisory: { hasActiveCaf: false, nextFolio: null, sufficientForSet: false },
    });
    expect(preview.folio).toBe(2);
    expect(preview.emisorComplete).toBe(false);
    expect(preview.cafAdvisory.hasActiveCaf).toBe(false);
  });
});
