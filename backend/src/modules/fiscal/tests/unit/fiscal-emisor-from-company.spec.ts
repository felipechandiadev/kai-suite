import { Company } from '@modules/companies/domain/company.entity';
import {
  applyEmisorDtoToCompany,
  companyToEmisorPreview,
  emisorFromCompany,
  isEmisorCompleteFromCompany,
} from '../../domain/fiscal-emisor-from-company';

describe('fiscal-emisor-from-company', () => {
  const completeCompany = (): Company =>
    ({
      id: 'c1',
      razonSocial: 'Empresa Test SpA',
      rut: '76.543.210-K',
      businessActivity: 'Comercio',
      address: 'Av. Principal 100',
      commune: 'Santiago',
      city: 'Santiago',
      siiResolutionNumber: '80',
      siiResolutionDate: '2024-01-15',
    }) as Company;

  it('companyToEmisorPreview maps razonSocial to legalName', () => {
    const preview = companyToEmisorPreview(completeCompany());
    expect(preview.legalName).toBe('Empresa Test SpA');
    expect(preview.resolutionNumber).toBe('80');
    expect(preview.resolutionDate).toBe('2024-01-15');
  });

  it('isEmisorCompleteFromCompany true when all fields present', () => {
    expect(isEmisorCompleteFromCompany(completeCompany())).toBe(true);
  });

  it('isEmisorCompleteFromCompany false when commune missing', () => {
    const c = completeCompany();
    c.commune = null;
    expect(isEmisorCompleteFromCompany(c)).toBe(false);
  });

  it('emisorFromCompany returns EmisorData', () => {
    const emisor = emisorFromCompany(completeCompany());
    expect(emisor.legalName).toBe('Empresa Test SpA');
    expect(emisor.resolutionDate).toBe('2024-01-15');
  });

  it('emisorFromCompany throws when incomplete', () => {
    const c = completeCompany();
    c.siiResolutionNumber = null;
    expect(() => emisorFromCompany(c)).toThrow('Complete datos de emisor y resolución');
  });

  it('applyEmisorDtoToCompany updates company fields', () => {
    const c = completeCompany();
    applyEmisorDtoToCompany(c, {
      legalName: 'Nueva Razón',
      commune: 'Providencia',
      resolutionNumber: '99',
      resolutionDate: '2025-06-01',
    });
    expect(c.razonSocial).toBe('Nueva Razón');
    expect(c.commune).toBe('Providencia');
    expect(c.siiResolutionNumber).toBe('99');
    expect(c.siiResolutionDate).toBe('2025-06-01');
  });
});
