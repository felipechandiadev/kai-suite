import { IsObject, IsOptional } from 'class-validator';

export class UpdateFloorPlanDto {
  @IsOptional()
  @IsObject()
  floorPlan?: Record<string, unknown> | null;
}
