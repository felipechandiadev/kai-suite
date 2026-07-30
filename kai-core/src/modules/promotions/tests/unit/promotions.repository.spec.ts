/**
 * Placeholder para los tests del repositorio. El repositorio real llega
 * en PR 3 cuando se construya el CRUD admin. Por ahora validamos que
 * las entidades y el módulo se carguen correctamente.
 */
import { PromotionsModule } from '../../promotions.module';

describe('PromotionsModule', () => {
  it('es una clase y puede ser usada como @Module', () => {
    expect(typeof PromotionsModule).toBe('function');
    expect(PromotionsModule.name).toBe('PromotionsModule');
  });
});
