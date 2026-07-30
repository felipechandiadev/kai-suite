import {
  SET_BE_CASES,
  buildSetBePreview,
  splitLineAmounts,
  sumCaseTotals,
} from '../../domain/set-be.constants';
import { buildDteBoletaXml } from '../../infrastructure/boleta-envio.builder';

const emisor = {
  rut: '76192083-9',
  legalName: 'Empresa Certificación',
  businessActivity: 'Servicios',
  address: 'Calle 1',
  commune: 'Santiago',
  city: 'Santiago',
  resolutionNumber: '80',
  resolutionDate: '2020-01-01',
};

describe('set-be.constants', () => {
  it('CASO-1 montos', () => {
    const totals = sumCaseTotals(SET_BE_CASES[0].lines);
    expect(totals.mntTotal).toBe(29800);
    expect(totals.mntNeto).toBe(25042);
    expect(totals.iva).toBe(4758);
    expect(totals.mntExe).toBe(0);
  });

  it('CASO-2 montos', () => {
    const totals = sumCaseTotals(SET_BE_CASES[1].lines);
    expect(totals.mntTotal).toBe(2040);
  });

  it('CASO-3 montos', () => {
    const totals = sumCaseTotals(SET_BE_CASES[2].lines);
    expect(totals.mntTotal).toBe(4100);
  });

  it('CASO-4 mixto MntExe + MntNeto', () => {
    const totals = sumCaseTotals(SET_BE_CASES[3].lines);
    expect(totals.mntExe).toBe(2000);
    expect(totals.mntNeto).toBe(10689);
    expect(totals.iva).toBe(2031);
    expect(totals.mntTotal).toBe(14720);
  });

  it('CASO-5 total y unidad Kg en XML', () => {
    const totals = sumCaseTotals(SET_BE_CASES[4].lines);
    expect(totals.mntTotal).toBe(3500);
    const xml = buildDteBoletaXml(emisor, SET_BE_CASES[4], 5);
    expect(xml).toContain('<UnmdItem>Kg</UnmdItem>');
    expect(xml).toContain('<RazonRef>CASO-5</RazonRef>');
  });

  it('referencias SET en preview', () => {
    const rows = buildSetBePreview(1);
    expect(rows).toHaveLength(5);
    rows.forEach((row, i) => {
      expect(row.codRef).toBe('SET');
      expect(row.razonRef).toBe(`CASO-${i + 1}`);
      expect(row.folio).toBe(i + 1);
    });
  });

  it('folios correlativos en preview', () => {
    const rows = buildSetBePreview(42);
    expect(rows.map((r) => r.folio)).toEqual([42, 43, 44, 45, 46]);
  });

  it('splitLineAmounts exento vs afecto', () => {
    const aff = splitLineAmounts(1, 1190, false);
    expect(aff.lineNet).toBe(1000);
    expect(aff.lineIva).toBe(190);
    const exe = splitLineAmounts(2, 1000, true);
    expect(exe.lineExe).toBe(2000);
    expect(exe.lineNet).toBe(0);
  });
});
