import { Injectable, Logger } from '@nestjs/common';
import { CashSessionCoreService } from './cash-session-core.service';
import { SalesFromSessionService } from './sales-from-session.service';
import { SessionInventoryService } from './session-inventory.service';

/**
 * DEPRECATED: CashSessionsServiceFacade
 *
 * This is a backward compatibility layer that delegates all calls to the new
 * refactored services. Use the individual services directly for new code:
 * - CashSessionCoreService (session lifecycle)
 * - SalesFromSessionService (sale creation)
 * - SessionInventoryService (stock allocation)
 *
 * Timeline for removal: Q2 2026
 *
 * Migration path:
 * OLD: this.cashSessionsService.open(dto)
 * NEW: this.coreService.open(dto)
 *
 * OLD: this.cashSessionsService.createSale(dto)
 * NEW: this.salesService.createSale(dto)
 */
@Injectable()
export class CashSessionsServiceFacade {
  private readonly logger = new Logger('CashSessionsServiceFacade');

  constructor(
    private readonly coreService: CashSessionCoreService,
    private readonly salesService: SalesFromSessionService,
    private readonly inventoryService: SessionInventoryService,
  ) {}

  /**
   * DEPRECATED: Use CashSessionCoreService.findOne()
   */
  async findOne(id: string) {
    this.logger.warn(
      `[DEPRECATED] findOne() called. Use CashSessionCoreService.findOne() instead`,
    );
    return this.coreService.findOne(id);
  }

  /**
   * DEPRECATED: Use CashSessionCoreService.findAll()
   */
  async findAll(query: any) {
    this.logger.warn(
      `[DEPRECATED] findAll() called. Use CashSessionCoreService.findAll() instead`,
    );
    return this.coreService.findAll(query);
  }

  /**
   * DEPRECATED: Use CashSessionCoreService.open()
   */
  async open(openDto: any) {
    this.logger.warn(
      `[DEPRECATED] open() called. Use CashSessionCoreService.open() instead`,
    );
    return this.coreService.open(openDto);
  }

  /**
   * DEPRECATED: Use SalesFromSessionService.getSalesForSession()
   */
  async getSales(cashSessionId: string) {
    this.logger.warn(
      `[DEPRECATED] getSales() called. Use SalesFromSessionService.getSalesForSession() instead`,
    );
    return this.salesService.getSalesForSession(cashSessionId);
  }

  /**
   * DEPRECATED: Use SalesFromSessionService.createSale()
   */
  async createSale(createSaleDto: any) {
    this.logger.warn(
      `[DEPRECATED] createSale() called. Use SalesFromSessionService.createSale() instead`,
    );
    return this.salesService.createSale(createSaleDto);
  }

  /**
   * NOT YET MIGRATED: registerOpeningTransaction()
   * TODO: Implement via CashSessionCoreService + TransactionsService
   */
  async registerOpeningTransaction(dto: any) {
    this.logger.warn(
      `[TODO] registerOpeningTransaction() not yet migrated to new architecture. Placeholder response.`,
    );
    return {
      success: false,
      error:
        'registerOpeningTransaction requires refactoring. Use CashSessionCoreService.open() instead',
    };
  }

  /**
   * NOT YET MIGRATED: registerCashDeposit()
   * TODO: Analyze if this should be replaced by CashDepositsService
   */
  async registerCashDeposit(dto: any) {
    this.logger.warn(
      `[TODO] registerCashDeposit() not yet migrated. Use CashDepositsService instead.`,
    );
    return {
      success: false,
      error:
        'registerCashDeposit requires refactoring. Use CashDepositsService instead',
    };
  }

  /**
   * NOT YET MIGRATED: registerCashWithdrawal()
   * TODO: Analyze if this should be replaced by BankWithdrawalsService
   */
  async registerCashWithdrawal(dto: any) {
    this.logger.warn(
      `[TODO] registerCashWithdrawal() not yet migrated. Use BankWithdrawalsService instead.`,
    );
    return {
      success: false,
      error:
        'registerCashWithdrawal requires refactoring. Use BankWithdrawalsService instead',
    };
  }

  /**
   * DEPRECATED: Use CashSessionCoreService.close()
   */
  async closeCashSession(dto: any) {
    this.logger.warn(
      `[DEPRECATED] closeCashSession() called. Use CashSessionCoreService.close() instead`,
    );
    return this.coreService.close(dto.sessionId, dto.userId);
  }

  /**
   * FUTURE: Will call SalesFromSessionService.addLineItem()
   */
  async addLineItem(saleId: string, lineItem: any) {
    this.logger.warn(
      `[TODO] addLineItem() placeholder. Use SalesFromSessionService.addLineItem() when implemented`,
    );
    return {
      success: false,
      error: 'addLineItem not yet implemented in refactored services',
    };
  }

  /**
   * FUTURE: Will call SalesFromSessionService.updateLineItem()
   */
  async updateLineItem(saleId: string, lineItemId: string, updates: any) {
    this.logger.warn(
      `[TODO] updateLineItem() placeholder. Use SalesFromSessionService.updateLineItem() when implemented`,
    );
    return {
      success: false,
      error: 'updateLineItem not yet implemented in refactored services',
    };
  }

  /**
   * FUTURE: Will call SalesFromSessionService.deleteLineItem()
   */
  async deleteLineItem(saleId: string, lineItemId: string) {
    this.logger.warn(
      `[TODO] deleteLineItem() placeholder. Use SalesFromSessionService.deleteLineItem() when implemented`,
    );
    return {
      success: false,
      error: 'deleteLineItem not yet implemented in refactored services',
    };
  }

  /**
   * FUTURE: Will call CashSessionCoreService.reconcile()
   */
  async reconcile(sessionId: string, physicalAmount: number) {
    this.logger.warn(
      `[TODO] reconcile() placeholder. Use CashSessionCoreService.reconcile() when implemented`,
    );
    return {
      success: false,
      error: 'reconcile not yet implemented in refactored services',
    };
  }

  /**
   * FUTURE: Will call SessionInventoryService.getAllocations()
   */
  async getInventoryAllocations(sessionId: string) {
    this.logger.warn(
      `[TODO] getInventoryAllocations() placeholder. Use SessionInventoryService.getAllocations() when implemented`,
    );
    return {
      success: false,
      error:
        'getInventoryAllocations not yet implemented in refactored services',
    };
  }
}
