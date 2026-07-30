import { Permission } from '../../domain/permission.entity';
import { PermissionResponseDto } from '../dto/permission-response.dto';

export class PermissionMapper {
  static toResponseDto(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      ability: permission.ability,
      userId: permission.userId,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  static toResponseDtoList(permissions: Permission[]): PermissionResponseDto[] {
    return permissions.map((permission) => this.toResponseDto(permission));
  }
}
