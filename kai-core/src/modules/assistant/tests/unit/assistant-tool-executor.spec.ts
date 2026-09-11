import { NotFoundException } from '@nestjs/common';
import { AssistantToolExecutor } from '../../application/assistant-tool-executor.service';
import type { CurrentUserPayload } from '@common/tenant';

function admin(): CurrentUserPayload {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userName: 'admin',
    rol: 'ADMIN',
    companyId: '22222222-2222-2222-2222-222222222222',
    roles: ['ADMIN'],
  };
}

function operator(): CurrentUserPayload {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    userName: 'pos',
    rol: 'POS_OPERATOR',
    companyId: '22222222-2222-2222-2222-222222222222',
    roles: ['POS_OPERATOR'],
  };
}

function makeExecutor(opts?: {
  salesRun?: jest.Mock;
  hcmRun?: jest.Mock;
  isKaiFood?: boolean;
  customersSearch?: jest.Mock;
}) {
  const salesRun =
    opts?.salesRun ??
    jest.fn().mockResolvedValue({ title: 'ok', rows: [{ a: 1 }], columns: [] });
  const salesRunner = {
    run: salesRun,
    listCatalog: jest.fn().mockReturnValue([
      { id: 'sales-by-period', title: 'Ventas', description: '' },
    ]),
  };
  const emptyRunner = {
    run: jest.fn(),
    listCatalog: jest.fn().mockReturnValue([]),
  };
  const hcmRunner = {
    run:
      opts?.hcmRun ??
      jest.fn().mockResolvedValue({ title: 'Horas', rows: [], columns: [] }),
    listCatalog: jest.fn().mockReturnValue([
      { id: 'hours-planned-by-employee', title: 'Horas', description: '' },
    ]),
  };
  const productMode = {
    isKaiFood: () => opts?.isKaiFood ?? false,
    getProductMode: () => 'kaistore',
  };
  const customersSearch =
    opts?.customersSearch ??
    jest.fn().mockResolvedValue({ success: true, total: 0, customers: [] });
  return {
    salesRun,
    customersSearch,
    executor: new AssistantToolExecutor(
      { getAllBranches: jest.fn() } as never,
      salesRunner as never,
      emptyRunner as never,
      emptyRunner as never,
      emptyRunner as never,
      hcmRunner as never,
      productMode as never,
      { validate: jest.fn() } as never,
      { run: jest.fn() } as never,
      {} as never,
      {} as never,
      { search: customersSearch } as never,
    ),
  };
}

describe('AssistantToolExecutor reports', () => {
  const companyId = '22222222-2222-2222-2222-222222222222';

  it('forwards sales-by-payment-method without an allowlist', async () => {
    const { executor, salesRun } = makeExecutor();
    const res = await executor.execute(companyId, admin(), 'run_sales_report', {
      reportId: 'sales-by-payment-method',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-18',
    });
    expect(res.ok).toBe(true);
    expect(salesRun).toHaveBeenCalledWith(
      companyId,
      'sales-by-payment-method',
      expect.objectContaining({ dateFrom: '2026-08-01', dateTo: '2026-08-18' }),
    );
  });

  it('forwards customerId for customer-purchases', async () => {
    const { executor, salesRun } = makeExecutor();
    const res = await executor.execute(companyId, admin(), 'run_sales_report', {
      reportId: 'customer-purchases',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-18',
      customerId: '44444444-4444-4444-4444-444444444444',
    });
    expect(res.ok).toBe(true);
    expect(salesRun).toHaveBeenCalledWith(
      companyId,
      'customer-purchases',
      expect.objectContaining({
        customerId: '44444444-4444-4444-4444-444444444444',
      }),
    );
  });

  it('maps unknown report id to SAMI_UNKNOWN_REPORT', async () => {
    const { executor } = makeExecutor({
      salesRun: jest
        .fn()
        .mockImplementation(async () => {
          throw new NotFoundException('Reporte desconocido: nope');
        }),
    });
    const res = await executor.execute(companyId, admin(), 'run_sales_report', {
      reportId: 'nope',
    });
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe('SAMI_UNKNOWN_REPORT');
  });

  it('denies HCM to non-admin', async () => {
    const { executor } = makeExecutor();
    const res = await executor.execute(companyId, operator(), 'run_hcm_report', {
      reportId: 'hours-planned-by-employee',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-18',
    });
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe('SAMI_FORBIDDEN');
  });

  it('runs HCM for admin', async () => {
    const hcmRun = jest.fn().mockResolvedValue({ title: 'Horas', rows: [], columns: [] });
    const { executor } = makeExecutor({ hcmRun });
    const res = await executor.execute(companyId, admin(), 'run_hcm_report', {
      reportId: 'hours-planned-by-employee',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-18',
    });
    expect(res.ok).toBe(true);
    expect(hcmRun).toHaveBeenCalled();
  });

  it('search_customers strips PII and caps pageSize', async () => {
    const customersSearch = jest.fn().mockResolvedValue({
      success: true,
      total: 1,
      customers: [
        {
          customerId: 'c-1',
          displayName: 'Patricia Núñez',
          documentNumber: '12.345.678-9',
          email: 'patricia@example.com',
          phone: '+56911111111',
          isActive: true,
        },
      ],
    });
    const { executor } = makeExecutor({ customersSearch });
    const res = await executor.execute(companyId, admin(), 'search_customers', {
      query: 'Patricia',
      pageSize: 50,
    });
    expect(res.ok).toBe(true);
    expect(customersSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Patricia', pageSize: 10, activeOnly: true }),
    );
    const table = res.blocks.find((b) => b.type === 'table');
    expect(table && table.type === 'table').toBe(true);
    if (table && table.type === 'table') {
      expect(table.rows[0]).toEqual({
        customerId: 'c-1',
        displayName: 'Patricia Núñez',
        isActive: true,
      });
      expect(JSON.stringify(table.rows)).not.toContain('12.345.678-9');
      expect(JSON.stringify(table.rows)).not.toContain('patricia@example.com');
    }
  });
});
