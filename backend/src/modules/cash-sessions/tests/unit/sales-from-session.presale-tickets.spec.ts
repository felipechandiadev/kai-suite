import { BadRequestException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';
import { PresaleTicketStatus } from '@modules/presale-tickets/domain/presale-ticket.entity';
import type { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';

describe('SalesFromSessionService — presale tickets', () => {
  function buildPointOfSale(): PointOfSale {
    return {
      id: 'pos-1',
      companyId: 'company-1',
      branchId: 'branch-1',
      settings: { kind: 'SALE', acceptsPresaleTickets: true },
    } as unknown as PointOfSale;
  }

  function buildService(ticketsById: Record<string, unknown>) {
    const service = Object.create(
      SalesFromSessionService.prototype,
    ) as SalesFromSessionService;
    const manager = {
      getRepository: () => ({
        findOne: async ({ where }: { where: { id: string } }) =>
          ticketsById[where.id] ?? null,
      }),
    };
    return { service, manager };
  }

  async function assertSatisfiable(
    ticketIds: string[],
    saleLines: Array<{ productVariantId: string; quantity: number }>,
    ticketsById: Record<string, unknown>,
  ) {
    const { service, manager } = buildService(ticketsById);
    return (service as unknown as {
      assertFulfillPresaleTicketsSatisfiable: (
        manager: unknown,
        ids: string[],
        lines: unknown[],
        pos: PointOfSale,
      ) => Promise<void>;
    }).assertFulfillPresaleTicketsSatisfiable(
      manager,
      ticketIds,
      saleLines,
      buildPointOfSale(),
    );
  }

  function readyTicket(
    id: string,
    lines: Array<{ productVariantId: string; quantity: number }>,
  ) {
    return {
      id,
      companyId: 'company-1',
      branchId: 'branch-1',
      status: PresaleTicketStatus.READY,
      lines: lines.map((l) => ({
        productVariantId: l.productVariantId,
        quantity: l.quantity,
      })),
    };
  }

  it('accepts cart that exactly matches one ticket', async () => {
    await expect(
      assertSatisfiable(
        ['ticket-a'],
        [{ productVariantId: 'v1', quantity: 2 }],
        { 'ticket-a': readyTicket('ticket-a', [{ productVariantId: 'v1', quantity: 2 }]) },
      ),
    ).resolves.toBeUndefined();
  });

  it('accepts cart with ticket lines plus extra products', async () => {
    await expect(
      assertSatisfiable(
        ['ticket-a'],
        [
          { productVariantId: 'v1', quantity: 2 },
          { productVariantId: 'v2', quantity: 1 },
        ],
        { 'ticket-a': readyTicket('ticket-a', [{ productVariantId: 'v1', quantity: 2 }]) },
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects cart with insufficient quantity for ticket', async () => {
    await expect(
      assertSatisfiable(
        ['ticket-a'],
        [{ productVariantId: 'v1', quantity: 1 }],
        { 'ticket-a': readyTicket('ticket-a', [{ productVariantId: 'v1', quantity: 2 }]) },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts two tickets with distinct variants and extra loose product', async () => {
    await expect(
      assertSatisfiable(
        ['ticket-a', 'ticket-b'],
        [
          { productVariantId: 'v1', quantity: 2 },
          { productVariantId: 'v2', quantity: 1 },
          { productVariantId: 'v3', quantity: 3 },
        ],
        {
          'ticket-a': readyTicket('ticket-a', [{ productVariantId: 'v1', quantity: 2 }]),
          'ticket-b': readyTicket('ticket-b', [{ productVariantId: 'v2', quantity: 1 }]),
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('accepts two tickets sharing a variant when cart has enough total quantity', async () => {
    await expect(
      assertSatisfiable(
        ['ticket-a', 'ticket-b'],
        [{ productVariantId: 'v1', quantity: 3 }],
        {
          'ticket-a': readyTicket('ticket-a', [{ productVariantId: 'v1', quantity: 2 }]),
          'ticket-b': readyTicket('ticket-b', [{ productVariantId: 'v1', quantity: 1 }]),
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects two tickets sharing a variant when cart quantity is insufficient', async () => {
    await expect(
      assertSatisfiable(
        ['ticket-a', 'ticket-b'],
        [{ productVariantId: 'v1', quantity: 2 }],
        {
          'ticket-a': readyTicket('ticket-a', [{ productVariantId: 'v1', quantity: 2 }]),
          'ticket-b': readyTicket('ticket-b', [{ productVariantId: 'v1', quantity: 1 }]),
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows boleta emission when fulfilling presale tickets', () => {
    const service = Object.create(
      SalesFromSessionService.prototype,
    ) as SalesFromSessionService;
    const shouldEmit = (service as unknown as {
      shouldEmitSaleBoleta: (
        dto: { deferPayment?: boolean; payments?: { amount: number }[] },
        fulfillBackorderId?: string,
      ) => boolean;
    }).shouldEmitSaleBoleta;

    expect(
      shouldEmit(
        { payments: [{ amount: 5000 }] },
        undefined,
      ),
    ).toBe(true);
    expect(
      shouldEmit(
        { payments: [{ amount: 5000 }] },
        'backorder-1',
      ),
    ).toBe(false);
  });

  it('dedupes presale ticket ids in createSale before registerPosCommercial', async () => {
    const registerPosCommercial = jest.fn().mockResolvedValue({ success: true });
    const service = Object.create(SalesFromSessionService.prototype) as SalesFromSessionService;
    Object.assign(service, { registerPosCommercial });

    await service.createSale({
      userName: 'cashier',
      pointOfSaleId: 'pos-1',
      cashSessionId: 'session-1',
      paymentMethod: 'CASH',
      fulfillPresaleTicketId: 'ticket-a',
      fulfillPresaleTicketIds: ['ticket-a', 'ticket-b'],
      lines: [{ productVariantId: 'v1', quantity: 1, unitPrice: 1000 }],
    } as never);

    expect(registerPosCommercial).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fulfillPresaleTicketIds: ['ticket-a', 'ticket-b'],
      }),
    );
  });
});
