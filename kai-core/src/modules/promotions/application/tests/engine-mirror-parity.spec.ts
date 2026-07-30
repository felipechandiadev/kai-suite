import * as fs from 'fs';
import * as path from 'path';

/**
 * Verifica que el motor del POS sea una copia byte-a-byte del motor del
 * backend (ignorando los imports relativos, que necesariamente
 * difieren). Si este test falla **es un bug**: el mirror está drifteado
 * y los descuentos podrían calcularse distinto en cliente y servidor.
 */
describe('engine-mirror parity', () => {
  const repoRoot = path.resolve(__dirname, '../../../../../../');
  const backendDir = path.join(repoRoot, 'kai-core/src/modules/promotions');
  const posDir = path.join(repoRoot, 'kai-pos/src/features/promotions/lib');

  function readNormalized(p: string): string {
    const raw = fs.readFileSync(p, 'utf8');
    return (
      raw
        // Quita imports (los paths necesariamente difieren entre repos).
        .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
        // Quita comentarios de bloque /** ... */ (la documentación
        // puede vivir solo en el backend canónico).
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Quita comentarios de línea.
        .replace(/\/\/.*$/gm, '')
        // Colapsa espacios en blanco para insensibilidad de formato.
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  it('promotion.enums.ts está alineado', () => {
    const backend = readNormalized(path.join(backendDir, 'domain/promotion.enums.ts'));
    const pos = readNormalized(path.join(posDir, 'promotion.enums.ts'));
    expect(pos).toBe(backend);
  });

  it('discount-engine.types.ts está alineado', () => {
    const backend = readNormalized(
      path.join(backendDir, 'application/discount-engine.types.ts'),
    );
    const pos = readNormalized(path.join(posDir, 'discount-engine.types.ts'));
    expect(pos).toBe(backend);
  });

  it('discount-engine.ts está alineado', () => {
    const backend = readNormalized(
      path.join(backendDir, 'application/discount-engine.ts'),
    );
    const pos = readNormalized(path.join(posDir, 'discount-engine.ts'));
    expect(pos).toBe(backend);
  });
});
