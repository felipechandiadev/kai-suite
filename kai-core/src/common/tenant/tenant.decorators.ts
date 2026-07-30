import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_KEY = 'skipTenant';

/**
 * Marca una ruta o controller como público (no requiere autenticación ni tenant).
 * Usar con cuidado: solo para login, health checks, etc.
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);

export const SUPER_ADMIN_ONLY_KEY = 'superAdminOnly';

/**
 * Marca una ruta como exclusiva para SUPER_ADMIN (global del deploy, no
 * atado a empresa). El TenantGuard rechazará a cualquier otro rol.
 * Pensado para acciones globales: gestión de empresas, gestión de otros
 * super-admins, etc.
 */
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_ONLY_KEY, true);

export const ADMIN_ONLY_KEY = 'adminOnly';

/**
 * Marca una ruta como exclusiva para usuarios con rol ADMIN o SUPER_ADMIN.
 * El TenantGuard rechazará el request si el usuario es OPERATOR.
 * Útil para configuración dentro de una empresa (sucursales, parámetros,
 * gestión de usuarios scope-empresa).
 */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

export const ALLOW_ADMIN_WITHOUT_COMPANY_KEY = 'allowAdminWithoutCompany';

/**
 * Permite que un SUPER_ADMIN ejecute esta ruta SIN seleccionar una company
 * activa. Útil para endpoints que listan/gestionan todas las companies.
 * No aplica a ADMIN/OPERATOR (que siempre requieren company).
 */
export const AllowAdminWithoutCompany = () =>
  SetMetadata(ALLOW_ADMIN_WITHOUT_COMPANY_KEY, true);
