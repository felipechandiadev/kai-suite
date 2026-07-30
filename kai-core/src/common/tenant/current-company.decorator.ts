import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Inyecta el companyId activo (resuelto por TenantGuard) en un parámetro del controller.
 * - Si el usuario es OPERATOR: companyId = user.companyId (siempre obligatorio).
 * - Si el usuario es ADMIN: companyId = header X-Active-Company-Id (validado contra companies).
 *
 * Si el endpoint marcó @SkipTenant() o se ejecuta como super-admin sin company,
 * el guard rechaza el request antes de llegar acá.
 */
export const CurrentCompany = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const companyId = req?.activeCompanyId as string | null | undefined;
    if (!companyId) {
      throw new Error(
        'activeCompanyId no resuelto: TenantGuard no ejecutado, header faltante o token inválido',
      );
    }
    return companyId;
  },
);

/**
 * Variante opcional: para endpoints que SÍ pueden ejecutarse fuera de una company
 * (p. ej. un super-admin listando todas las companies).
 */
export const OptionalCurrentCompany = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req?.activeCompanyId as string | null | undefined) ?? null;
  },
);
