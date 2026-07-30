import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MinLength,
  IsUUID,
  ValidateNested,
  IsEnum,
  ValidateIf,
  MaxLength,
  IsArray,
  IsBoolean,
  ArrayMinSize,
} from 'class-validator';
import { DocumentType, PersonType } from '@modules/persons/domain/person.entity';
import { EmploymentType } from '@modules/employees/domain/employee.entity';

export class CreateUserPersonDto {
  @IsOptional()
  @IsEnum(PersonType)
  type?: PersonType;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class AlsoAsEmployeeDto {
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsString()
  @IsNotEmpty()
  hireDate!: string;

  @IsOptional()
  @IsString()
  baseSalary?: string;
}

export class UserMembershipInputDto {
  @IsUUID('4')
  companyId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roles!: string[];

  @IsOptional()
  @IsBoolean()
  isOwner?: boolean;
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Username for the user',
    example: 'johndoe',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  userName!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  mail!: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    description: 'User role (legacy). Prefer memberships[].',
    example: 'OPERATOR',
    enum: [
      'SUPER_ADMIN',
      'ADMIN',
      'SUB_ADMIN',
      'OPERATOR',
      'POS_OPERATOR',
      'COURIER',
      'WAITER',
      'STOCK_OPERATOR',
      'KDS_OPERATOR',
    ],
  })
  @IsOptional()
  @IsString()
  rol?: string;

  @ApiPropertyOptional({
    description:
      'Empresa a la que pertenece (legacy). Prefer memberships[].',
    example: 'uuid-empresa',
  })
  @IsOptional()
  @IsString()
  companyId?: string | null;

  @ApiPropertyOptional({
    description: 'Memberships empresa × roles (multi-empresa / multi-rol)',
    type: [UserMembershipInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserMembershipInputDto)
  memberships?: UserMembershipInputDto[];

  @ApiPropertyOptional({
    description: 'Existing person ID to link (NATURAL). Required for non-SUPER_ADMIN unless person is sent.',
  })
  @ValidateIf((o: CreateUserDto) => o.rol !== 'SUPER_ADMIN' && !o.person)
  @IsUUID('4')
  personId?: string;

  @ApiPropertyOptional({
    description: 'Person NATURAL to create and link (required for non-SUPER_ADMIN unless personId).',
  })
  @ValidateIf((o: CreateUserDto) => o.rol !== 'SUPER_ADMIN' && !o.personId)
  @ValidateNested()
  @Type(() => CreateUserPersonDto)
  person?: CreateUserPersonDto;

  @ApiPropertyOptional({
    description: 'Also create an employee record for the same person (same transaction).',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlsoAsEmployeeDto)
  alsoAsEmployee?: AlsoAsEmployeeDto;
}

export class AlsoAsUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  userName!: string;

  @IsEmail()
  mail!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  rol?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'New username',
    example: 'johndoe_updated',
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({
    description: 'New email address',
    example: 'john.doe.updated@example.com',
  })
  @IsOptional()
  @IsEmail()
  mail?: string;

  @ApiPropertyOptional({
    description: 'New user role (legacy). Prefer memberships[].',
    example: 'OPERATOR',
  })
  @IsOptional()
  @IsString()
  rol?: string;

  @ApiPropertyOptional({
    description: 'Replace memberships (empresa × roles)',
    type: [UserMembershipInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserMembershipInputDto)
  memberships?: UserMembershipInputDto[];

  @ApiPropertyOptional({
    description: 'New phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'New person name',
    example: 'John Doe Updated',
  })
  @IsOptional()
  @IsString()
  personName?: string;

  @ApiPropertyOptional({
    description: 'New person document number',
    example: '987654321',
  })
  @IsOptional()
  @IsString()
  personDni?: string;

  @ApiPropertyOptional({
    description: 'Link an existing person to a legacy user without person',
  })
  @IsOptional()
  @IsUUID('4')
  personId?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class ChangeOwnPasswordDto {
  @ApiProperty({
    description: 'Current user ID',
    example: 'uuid-1234-5678',
  })
  @IsString()
  currentUserId?: string;

  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword?: string;
}
