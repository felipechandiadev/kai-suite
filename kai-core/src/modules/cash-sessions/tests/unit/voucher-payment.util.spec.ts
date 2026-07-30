import { BadRequestException } from '@nestjs/common';
import { assertVoucherPaymentsValid } from '../../application/voucher-payment.util';
import type { CompanyVoucherKind } from '@modules/companies/domain/company-voucher-kinds.types';

describe('assertVoucherPaymentsValid', () => {
  const kinds: CompanyVoucherKind[] = [
    {
      id: 'kind-gas',
      code: 'VK00001',
      name: 'Voucher gas',
      isActive: true,
      faceValueMode: 'FIXED',
      defaultFaceValue: 10000,
      requireFaceValue: false,
      defaultIssuerName: 'Empresa Gas',
    },
    {
      id: 'kind-meal',
      code: 'VK00002',
      name: 'Voucher almuerzo',
      isActive: true,
      faceValueMode: 'OPEN',
      defaultFaceValue: null,
      requireFaceValue: true,
    },
  ];

  const catalog = [
    {
      id: 'cmp-v',
      method: 'VOUCHER' as const,
      displayOrder: 0,
      isActive: true,
      requireReference: true,
      voucherKindId: 'kind-gas',
    },
  ];

  it('accepts FIXED via linked payment method', () => {
    expect(() =>
      assertVoucherPaymentsValid(
        [
          {
            paymentMethod: 'VOUCHER',
            amount: 5000,
            reference: 'V-001',
            companyPaymentMethodId: 'cmp-v',
            voucherData: { kindId: 'kind-gas', kindCode: 'VK00001' },
          },
        ],
        kinds,
        catalog as any,
      ),
    ).not.toThrow();
  });

  it('rejects amount greater than FIXED face', () => {
    expect(() =>
      assertVoucherPaymentsValid(
        [
          {
            paymentMethod: 'VOUCHER',
            amount: 12000,
            reference: 'V-001',
            companyPaymentMethodId: 'cmp-v',
          },
        ],
        kinds,
        catalog as any,
      ),
    ).toThrow(/valor nominal/);
  });

  it('requires faceValue for OPEN mode', () => {
    expect(() =>
      assertVoucherPaymentsValid(
        [
          {
            paymentMethod: 'VOUCHER',
            amount: 1000,
            reference: 'V-001',
            voucherData: { kindCode: 'VK00002' },
          },
        ],
        kinds,
      ),
    ).toThrow(/exige valor nominal/);
  });

  it('rejects missing reference', () => {
    expect(() =>
      assertVoucherPaymentsValid(
        [
          {
            paymentMethod: 'VOUCHER',
            amount: 1000,
            reference: '',
            companyPaymentMethodId: 'cmp-v',
          },
        ],
        kinds,
        catalog as any,
      ),
    ).toThrow(BadRequestException);
  });
});
