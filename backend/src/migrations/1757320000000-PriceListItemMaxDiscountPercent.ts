import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renombra el tope de descuento en filas de lista de precios:
 * discountPercentage → maxDiscountPercent (máximo descuento autorizado).
 */
export class PriceListItemMaxDiscountPercent1757320000000
  implements MigrationInterface
{
  name = 'PriceListItemMaxDiscountPercent1757320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'price_list_items'
            AND column_name = 'discountPercentage'
        ) THEN
          ALTER TABLE price_list_items
            RENAME COLUMN "discountPercentage" TO "maxDiscountPercent";
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'price_list_items'
            AND column_name = 'discountpercentage'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'price_list_items'
            AND column_name = 'maxDiscountPercent'
        ) THEN
          ALTER TABLE price_list_items
            RENAME COLUMN discountpercentage TO "maxDiscountPercent";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'price_list_items'
            AND column_name IN ('maxDiscountPercent', 'maxdiscountpercent')
        ) THEN
          ALTER TABLE price_list_items
            ADD COLUMN "maxDiscountPercent" numeric(5,2) NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'price_list_items'
            AND column_name = 'maxDiscountPercent'
        ) THEN
          ALTER TABLE price_list_items
            RENAME COLUMN "maxDiscountPercent" TO "discountPercentage";
        END IF;
      END $$
    `);
  }
}
