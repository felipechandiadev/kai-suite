import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Login success status',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'User information (only present on successful login)',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid-1234' },
      userName: { type: 'string', example: 'admin' },
      email: { type: 'string', example: 'admin@kai.local' },
      rol: { type: 'string', example: 'ADMIN' },
      person: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', example: 'uuid-5678' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: {
            type: 'string',
            example: 'john.doe@example.com',
            nullable: true,
          },
          phone: { type: 'string', example: '+1234567890', nullable: true },
        },
      },
    },
  })
  user?: {
    id: string;
    userName: string;
    email: string;
    rol: string;
    companyId: string | null;
    person?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    } | null;
  };

  @ApiPropertyOptional({
    description:
      'Empresa activa al iniciar sesión. ADMIN/OPERATOR: `user.companyId`. SUPER_ADMIN: empresa elegida o la primera activa.',
    example: 'uuid-1234',
    nullable: true,
  })
  activeCompanyId?: string | null;

  @ApiPropertyOptional({
    description: 'Modo Multiempresa (lectura consolidada; sin empresa activa)',
  })
  multiCompanyMode?: boolean;

  @ApiPropertyOptional({
    description: 'Memberships del usuario (roles por empresa)',
    type: 'array',
  })
  memberships?: Array<{
    companyId: string;
    roles: string[];
    isOwner: boolean;
  }>;

  @ApiPropertyOptional({
    description:
      'Empresas en contexto: memberships del usuario (SUPER_ADMIN: todas activas).',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        razonSocial: { type: 'string' },
        nombreFantasia: { type: 'string', nullable: true },
      },
    },
    nullable: true,
  })
  companies?:
    | Array<{
        id: string;
        razonSocial: string;
        nombreFantasia: string | null;
      }>
    | null;

  @ApiPropertyOptional({
    description: 'Error message (only present on failed login)',
    example: 'Invalid credentials',
  })
  message?: string;
}
