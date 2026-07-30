export class PermissionResponseDto {
  id: string;
  ability: string;
  userId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
