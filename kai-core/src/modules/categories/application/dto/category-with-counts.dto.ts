export class CategoryWithCountsDto {
  id: string;
  name: string;
  parentId?: string;
  productCount: number;
  childCount: number;
}
