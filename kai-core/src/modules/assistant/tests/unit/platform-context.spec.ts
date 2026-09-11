import { buildPlatformContextPrompt } from '../../application/prompts/platform-context.prompt';

describe('buildPlatformContextPrompt', () => {
  const now = new Date('2026-08-18T16:00:00.000Z');

  it('lists branches and sales tools', () => {
    const text = buildPlatformContextPrompt({
      productMode: 'kaisuite',
      diningEnabled: true,
      branches: [{ id: 'b1', name: 'Centro' }],
      now,
    });
    expect(text).toContain('kaisuite');
    expect(text).toContain('Centro (b1)');
    expect(text).toContain('run_sales_report');
    expect(text).toContain('sales-by-payment-method');
    expect(text).toContain('dimensions=[customer]');
    expect(text).toContain('search_customers');
    expect(text).toContain('export_report');
    expect(text).toContain('run_dining_report');
    expect(text).toContain('2026-08-01');
    expect(text).toContain('2026-08-18');
  });

  it('hides dining tools when not food', () => {
    const text = buildPlatformContextPrompt({
      productMode: 'kaistore',
      diningEnabled: false,
      branches: [],
      now,
    });
    expect(text).toContain('no aplica');
    expect(text).not.toContain('run_dining_report (dining-salon-summary');
  });
});
