import { DataSource } from 'typeorm';
import { bootRealDb, RealDbContext } from './support/app-context';

describe('arnés real-db (humo)', () => {
  let ctx: RealDbContext;
  beforeAll(async () => {
    ctx = await bootRealDb();
  });
  afterAll(async () => {
    await ctx?.close();
  });

  it('levanta la app contra una copia de la BD y aplica migraciones', async () => {
    const ds = ctx.app.get(DataSource);
    const [{ current_database }] = await ds.query('SELECT current_database()');
    expect(current_database).toBe(ctx.db.name);
    expect(current_database).not.toBe(ctx.db.source);
    const [{ n }] = await ds.query(
      `SELECT count(*)::int AS n FROM typeorm_migrations WHERE name = 'AccountingRuleAmountBasis1757740000000'`,
    );
    expect(n).toBe(1);
  });
});
