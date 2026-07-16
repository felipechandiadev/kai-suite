import {
  mapTransactionLineToBoletaLine,
  resolveReceptorFromPerson,
  formatChileanRut,
} from '../../domain/map-transaction-to-sale-boleta';
import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import type { Person } from '@modules/persons/domain/person.entity';

describe('map-transaction-to-sale-boleta', () => {
  it('maps affected line with IVA from line total', () => {
    const line = {
      quantity: 2,
      total: 2380,
      taxRate: 19,
      taxAmount: 380,
      productName: 'Arroz',
      unitOfMeasure: 'UN',
    } as TransactionLine;
    const mapped = mapTransactionLineToBoletaLine(line);
    expect(mapped.unitPriceWithIva).toBe(1190);
    expect(mapped.exempt).toBe(false);
    expect(mapped.quantity).toBe(2);
  });

  it('maps exempt line when no tax', () => {
    const line = {
      quantity: 1,
      total: 1000,
      taxRate: 0,
      taxAmount: 0,
      productName: 'Pan',
    } as TransactionLine;
    const mapped = mapTransactionLineToBoletaLine(line);
    expect(mapped.exempt).toBe(true);
  });

  it('uses generic receptor without person', () => {
    expect(resolveReceptorFromPerson(null)).toEqual({
      rut: '66666666-6',
      name: 'Cliente',
    });
  });

  it('uses customer RUT when document type is RUT', () => {
    const person = {
      documentType: 'RUT',
      documentNumber: '78543570-2',
      firstName: 'Marcela',
      lastName: 'Tapia',
    } as Person;
    expect(resolveReceptorFromPerson(person).rut).toBe('78543570-2');
  });

  it('still accepts legacy RUN document type for receptor', () => {
    const person = {
      documentType: 'RUN' as unknown as Person['documentType'],
      documentNumber: '78543570-2',
      firstName: 'Marcela',
      lastName: 'Tapia',
    } as Person;
    expect(resolveReceptorFromPerson(person).rut).toBe('78543570-2');
  });

  it('formats chilean rut with dv', () => {
    expect(formatChileanRut('78543570-2')).toBe('78543570-2');
  });
});
