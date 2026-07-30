import {
  computeSaleBoletaMntTotal,
  parseTedMntTotal,
  validateOfflineTedAgainstSaleContext,
} from '../../domain/validate-offline-ted-sale-context';
import type { SaleBoletaDocument } from '../../domain/sale-boleta.types';

describe('validate-offline-ted-sale-context', () => {
  const saleDoc: SaleBoletaDocument = {
    receptor: { rut: '66666666-6', name: 'Cliente' },
    lines: [{ name: 'Aceite', quantity: 1, unitPriceWithIva: 1190 }],
  };

  it('parseTedMntTotal lee MNT del TED', () => {
    const ted = '<TED><DD><MNT>1190</MNT></DD></TED>';
    expect(parseTedMntTotal(ted)).toBe(1190);
  });

  it('computeSaleBoletaMntTotal suma líneas del documento', () => {
    expect(computeSaleBoletaMntTotal(saleDoc)).toBe(1190);
  });

  it('rechaza TED con monto distinto al contexto servidor', () => {
    const ted = '<TED><DD><MNT>2500</MNT></DD></TED>';
    expect(validateOfflineTedAgainstSaleContext(ted, saleDoc)).toMatch(
      /no coincide/,
    );
  });

  it('acepta TED coherente con líneas DTE del servidor', () => {
    const ted = '<TED><DD><MNT>1190</MNT></DD></TED>';
    expect(validateOfflineTedAgainstSaleContext(ted, saleDoc)).toBeNull();
  });
});
