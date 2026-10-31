import { DataSource } from 'typeorm';
import { CashSessionCoreService } from '../../src/modules/cash-sessions/application/cash-session-core.service';
import { bootRealDb, RealDbContext } from './support/app-context';
import { asCompany, BaseFixtures, loadBase } from './support/fixtures';

describe('Apertura de caja (BD real)', () => {
  let ctx: RealDbContext;
  let ds: DataSource;
  let base: BaseFixtures;
  let userName: string;

  beforeAll(async () => {
    ctx = await bootRealDb();
    ds = ctx.app.get(DataSource);
    base = await loadBase(ds);
    [{ userName }] = await ds.query(`SELECT "userName" FROM users WHERE id=$1`, [base.userId]);
  });
  afterAll(async () => {
    await ctx?.close();
  });

  const closeAll = () =>
    ds.query(
      `UPDATE cash_sessions SET status='CLOSED' WHERE "pointOfSaleId"=$1 AND status::text='OPEN'`,
      [base.pointOfSaleId],
    );
  const open = () =>
    asCompany(base, () =>
      ctx.app.get(CashSessionCoreService).open({
        userId: base.userId,
        userName,
        pointOfSaleId: base.pointOfSaleId,
        openingAmount: 0,
      } as any),
    ) as Promise<any>;
  const countOpen = async () =>
    Number(
      (
        await ds.query(
          `SELECT COUNT(*)::int AS n FROM cash_sessions WHERE "pointOfSaleId"=$1 AND status::text='OPEN'`,
          [base.pointOfSaleId],
        )
      )[0].n,
    );
  const openings = async (sessionId: string) =>
    Number(
      (
        await ds.query(
          `SELECT COUNT(*)::int AS n FROM transactions WHERE "cashSessionId"=$1 AND "transactionType"::text='CASH_SESSION_OPENING'`,
          [sessionId],
        )
      )[0].n,
    );

  it('aperturas simultáneas del mismo punto de venta dejan una sola sesión abierta', async () => {
    await closeAll();
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => open()));
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const ids = new Set(results.map((r) => (r as PromiseFulfilledResult<any>).value.cashSession.id));
    expect(ids.size).toBe(1);
    expect(await countOpen()).toBe(1);
  });

  it('volver a abrir una sesión ya abierta devuelve la misma sin crear otra transacción de apertura', async () => {
    await closeAll();
    const first = await open();
    const second = await open();
    expect(second.cashSession.id).toBe(first.cashSession.id);
    expect(await openings(first.cashSession.id)).toBe(1);
  });
});
