import * as fs from 'fs';
import * as path from 'path';

/**
 * Cada archivo de `src/migrations` debe estar en el arreglo `migrations` de
 * `config/data-source.ts`; si no, `migration:run` lo ignora en silencio
 * (pasó con ReceptionVoid1757730000000).
 */

/**
 * Migraciones antiguas que existen como archivo pero nunca se registraron.
 * No se registran sin revisión: DropEmploymentContractGratification elimina
 * columnas y las demás duplican cambios ya presentes en las bases. Esta lista
 * NO debe crecer: una migración nueva debe registrarse.
 */
const LEGACY_UNREGISTERED = new Set([
  '1754000000000-ReceptionDteFields',
  '1756210000000-ProductVariantSalePriceHistory',
  '1756420000000-EShopHeroSlideTextColor',
  '1756430000000-ProductVisibleInEShop',
  '1756540000000-ReceptionLineStockSnapshot',
  '1757190000000-DropEmploymentContractGratification',
]);

describe('migraciones registradas', () => {
  const migrationsDir = path.resolve(__dirname, '..');
  const dataSource = fs.readFileSync(
    path.resolve(__dirname, '../../config/data-source.ts'),
    'utf8',
  );
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+-.+\.ts$/.test(f))
    .map((f) => f.replace(/\.ts$/, ''))
    .filter((f) => !LEGACY_UNREGISTERED.has(f));

  it('la lista de excepciones sigue vigente', () => {
    for (const legacy of LEGACY_UNREGISTERED) {
      expect(fs.existsSync(path.join(migrationsDir, `${legacy}.ts`))).toBe(true);
      expect(dataSource).not.toContain(`/migrations/${legacy}'`);
    }
  });

  const migrationsBlock = dataSource.slice(dataSource.indexOf('migrations: ['));

  it('hay migraciones que verificar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s está importada y registrada', (file) => {
    const importLine = new RegExp(`from '\\.\\./migrations/${file}'`);
    expect(dataSource).toMatch(importLine);

    const className = dataSource.match(
      new RegExp(`import \\{ (\\w+) \\} from '\\.\\./migrations/${file}'`),
    )?.[1];
    expect(className).toBeDefined();
    expect(migrationsBlock).toMatch(new RegExp(`\\b${className}\\b`));
  });
});
