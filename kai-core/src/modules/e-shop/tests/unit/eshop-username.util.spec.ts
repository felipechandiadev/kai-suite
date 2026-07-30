import { normalizeEshopUsername } from '../../application/helpers/eshop-username.util';

describe('eshop-username.util', () => {
  it('strips @ and lowercases', () => {
    expect(normalizeEshopUsername('@Juan_12')).toEqual({ ok: true, username: 'juan_12' });
  });

  it('rejects short usernames', () => {
    expect(normalizeEshopUsername('ab').ok).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(normalizeEshopUsername('juan-perez').ok).toBe(false);
  });

  it('rejects reserved names', () => {
    expect(normalizeEshopUsername('admin').ok).toBe(false);
  });
});
