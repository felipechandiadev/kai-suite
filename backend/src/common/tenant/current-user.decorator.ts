import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserMembership {
  companyId: string;
  roles: string[];
  isOwner: boolean;
}

export interface CurrentUserPayload {
  id: string;
  userName: string;
  rol: string;
  companyId: string | null;
  memberships?: CurrentUserMembership[];
  /** Roles en la empresa activa (o unión en multi). */
  roles?: string[];
  isOwner?: boolean;
  multiCompanyMode?: boolean;
}

/**
 * Inyecta el usuario autenticado (resuelto por TenantGuard) en un parámetro del controller.
 * Lanza si el guard no fue ejecutado o el usuario no fue resuelto.
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest();
    if (!req?.currentUser) {
      throw new Error(
        'CurrentUser no resuelto: TenantGuard no ejecutado o token inválido',
      );
    }
    return req.currentUser as CurrentUserPayload;
  },
);
