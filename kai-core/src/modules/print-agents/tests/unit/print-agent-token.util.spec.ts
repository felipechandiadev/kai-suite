import {
  generatePrintAgentToken,
  hashPrintAgentToken,
  normalizePrintAgentToken,
} from '../../application/print-agent-token.util';

describe('print-agent-token.util', () => {
  it('generates hex token of expected length', () => {
    const t = generatePrintAgentToken();
    expect(t).toMatch(/^[a-f0-9]{48}$/);
    expect(normalizePrintAgentToken(t)).toBe(t);
  });

  it('hashes stably', () => {
    const t = generatePrintAgentToken();
    expect(hashPrintAgentToken(t)).toBe(hashPrintAgentToken(t));
    expect(hashPrintAgentToken(t)).toHaveLength(64);
  });

  it('rejects invalid tokens', () => {
    expect(normalizePrintAgentToken('short')).toBeNull();
    expect(normalizePrintAgentToken('')).toBeNull();
    expect(normalizePrintAgentToken(null)).toBeNull();
  });
});
