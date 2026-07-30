import { CreateTransactionDto } from './create-transaction.dto';
import { TransactionType, PaymentMethod } from '../../domain/transaction.entity';

const B1 = '550e8400-e29b-41d4-a716-446655440001';
const B2 = '550e8400-e29b-41d4-a716-446655440002';
const U1 = '550e8400-e29b-41d4-a716-446655440003';
const P1 = '550e8400-e29b-41d4-a716-446655440004';
const V1 = '550e8400-e29b-41d4-a716-446655440005';
const UN = '550e8400-e29b-41d4-a716-446655440006';

describe('CreateTransactionDto.validate (plain líneas → nested)', () => {
  it('accepts ADJUSTMENT_IN with plain-object lines after internal coercion', () => {
    const txDto = new CreateTransactionDto();
    txDto.transactionType = TransactionType.ADJUSTMENT_IN;
    txDto.branchId = B1;
    txDto.userId = U1;
    txDto.storageId = B2;
    txDto.subtotal = 90;
    txDto.taxAmount = 0;
    txDto.discountAmount = 0;
    txDto.total = 90;
    txDto.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txDto.amountPaid = 90;
    txDto.lines = [
      {
        productId: P1,
        productVariantId: V1,
        unitId: UN,
        productName: 'Test',
        productSku: 'SKU',
        quantity: 90,
        unitPrice: 0,
        unitCost: 0,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: 90,
        total: 90,
      } as any,
    ];

    expect(txDto.validate()).toEqual([]);
  });

  it('accepts ADJUSTMENT_IN without lines', () => {
    const txDto = new CreateTransactionDto();
    txDto.transactionType = TransactionType.ADJUSTMENT_IN;
    txDto.branchId = B1;
    txDto.userId = U1;
    txDto.storageId = B2;
    txDto.subtotal = 90;
    txDto.taxAmount = 0;
    txDto.discountAmount = 0;
    txDto.total = 90;
    txDto.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txDto.amountPaid = 90;
    txDto.lines = [];

    expect(txDto.validate()).toEqual([]);
  });
});
