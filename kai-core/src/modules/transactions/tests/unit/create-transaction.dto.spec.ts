import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '../../application/dto/create-transaction.dto';
import {
  TransactionType,
  PaymentMethod,
} from '../../domain/transaction.entity';

describe('CreateTransactionDto', () => {
  describe('validate()', () => {
    it('should accept BANK_TO_CASH_TRANSFER with bankAccountKey and cashHubId', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.BANK_TO_CASH_TRANSFER;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.TRANSFER;
      dto.bankAccountKey = 'bank-key-1';
      dto.cashHubId = '223e4567-e89b-12d3-a456-426614174001';

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should reject BANK_TO_CASH_TRANSFER without bankAccountKey', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.BANK_TO_CASH_TRANSFER;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.TRANSFER;

      const errors = dto.validate();

      expect(errors).toContain('BANK_TO_CASH_TRANSFER requiere bankAccountKey');
    });

    it('should reject PAYROLL_PAYMENT without employeeId', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYROLL_PAYMENT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.TRANSFER;
      dto.relatedTransactionId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = dto.validate();

      expect(errors).toContain('PAYROLL_PAYMENT requiere employeeId');
    });

    it('should accept SUPPLIER_PAYMENT with supplier and related document', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_PAYMENT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.CASH;
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174000';
      dto.relatedTransactionId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should accept EXPENSE_PAYMENT with expense category', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.EXPENSE_PAYMENT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.CASH;
      dto.expenseCategoryId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should reject SUPPLIER_CREDIT_NOTE without purchaseReturnId in metadata', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174001';
      dto.subtotal = 100;
      dto.total = 100;
      dto.metadata = { links: {} };
      dto.lines = [
        plainLine({ productName: 'x', quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }),
      ];

      const errors = dto.validate();

      expect(errors.some((e) => e.includes('purchaseReturnId'))).toBe(true);
    });

    it('should reject SUPPLIER_HONORARIUM_RECEIPT without supplierId', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_HONORARIUM_RECEIPT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.lines = [
        plainLine({ productName: 'x', quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }),
      ];

      const errors = dto.validate();

      expect(
        errors.some((e) => e.includes('SUPPLIER_HONORARIUM_RECEIPT requiere supplierId')),
      ).toBe(true);
    });

    it('should reject SUPPLIER_RECEIPT without supplierId', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_RECEIPT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.lines = [
        plainLine({ productName: 'x', quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }),
      ];

      const errors = dto.validate();

      expect(errors.some((e) => e.includes('SUPPLIER_RECEIPT requiere supplierId'))).toBe(true);
    });

    it('should accept SUPPLIER_GUIDE with supplierId and lines', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_GUIDE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174001';
      dto.subtotal = 200;
      dto.total = 200;
      dto.lines = [
        plainLine({ productName: 'G', quantity: 1, unitPrice: 200, subtotal: 200, total: 200 }),
      ];

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should reject SALE_RETURN without relatedTransactionId', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SALE_RETURN;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.customerId = '123e4567-e89b-12d3-a456-426614174001';
      dto.storageId = '123e4567-e89b-12d3-a456-426614174002';
      dto.subtotal = 100;
      dto.total = 100;
      dto.lines = [
        plainLine({ productName: 'x', quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }),
      ];

      const errors = dto.validate();

      expect(errors.some((e) => e.includes('relatedTransactionId'))).toBe(true);
    });

    it('should accept SALE_RETURN with sale link and lines', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SALE_RETURN;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.customerId = '123e4567-e89b-12d3-a456-426614174001';
      dto.storageId = '123e4567-e89b-12d3-a456-426614174002';
      dto.relatedTransactionId = '123e4567-e89b-12d3-a456-426614174099';
      dto.subtotal = 100;
      dto.total = 100;
      dto.lines = [
        plainLine({ productName: 'x', quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }),
      ];

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should reject CUSTOMER_CREDIT_NOTE without saleReturnId', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.CUSTOMER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.customerId = '123e4567-e89b-12d3-a456-426614174001';
      dto.subtotal = 50;
      dto.total = 50;
      dto.metadata = { links: {} };

      const errors = dto.validate();

      expect(errors.some((e) => e.includes('saleReturnId'))).toBe(true);
    });

    it('should accept CUSTOMER_CREDIT_NOTE with backorderId and totals only', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.CUSTOMER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.customerId = '123e4567-e89b-12d3-a456-426614174001';
      dto.relatedTransactionId = '123e4567-e89b-12d3-a456-426614174099';
      dto.subtotal = 50;
      dto.taxAmount = 10;
      dto.total = 60;
      dto.metadata = {
        links: {
          backorderId: '123e4567-e89b-12d3-a456-426614174099',
          backorderDocumentNumber: 'ENCARGO-1',
        },
      };

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should accept CUSTOMER_CREDIT_NOTE with saleReturnId and totals only', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.CUSTOMER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.customerId = '123e4567-e89b-12d3-a456-426614174001';
      dto.relatedTransactionId = '123e4567-e89b-12d3-a456-426614174099';
      dto.subtotal = 50;
      dto.taxAmount = 10;
      dto.total = 60;
      dto.metadata = {
        links: {
          saleReturnId: '123e4567-e89b-12d3-a456-426614174099',
          saleId: '123e4567-e89b-12d3-a456-426614174088',
        },
      };

      const errors = dto.validate();

      expect(errors.length).toBe(0);
    });

    it('should accept SUPPLIER_CREDIT_NOTE with purchaseReturnId and lines', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174001';
      dto.subtotal = 50;
      dto.total = 50;
      dto.metadata = {
        links: { purchaseReturnId: '123e4567-e89b-12d3-a456-426614174099' },
      };
      dto.lines = [
        plainLine({ productName: 'NC', quantity: 1, unitPrice: 50, subtotal: 50, total: 50 }),
      ];

      const errors = dto.validate();

      expect(errors.filter((e) => e.includes('purchaseReturnId'))).toHaveLength(0);
    });
  });
});

function plainLine(p: {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total: number;
}): CreateTransactionLineDto {
  const line = new CreateTransactionLineDto();
  line.productName = p.productName;
  line.quantity = p.quantity;
  line.unitPrice = p.unitPrice;
  line.subtotal = p.subtotal;
  line.total = p.total;
  line.discountPercentage = 0;
  line.discountAmount = 0;
  line.taxRate = 0;
  line.taxAmount = 0;
  return line;
}
