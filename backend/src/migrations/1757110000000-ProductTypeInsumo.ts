import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extiende el enum nativo de Postgres de `products.productType` (si existe)
 * con `INSUMO` (materia prima no vendible).
 */
export class ProductTypeInsumo1757110000000 implements MigrationInterface {
  name = 'ProductTypeInsumo1757110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        udt text;
        is_enum boolean;
      BEGIN
        SELECT c.udt_name INTO udt
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'products'
          AND lower(c.column_name) IN ('producttype', 'product_type')
        LIMIT 1;

        IF udt IS NULL THEN
          RAISE NOTICE 'products.productType: columna no encontrada; se omite ALTER TYPE';
          RETURN;
        END IF;

        SELECT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = udt
            AND n.nspname = 'public'
            AND t.typtype = 'e'
        ) INTO is_enum;

        IF NOT is_enum THEN
          RAISE NOTICE 'products.productType no es enum PG (p. ej. varchar); se omite ALTER TYPE';
          RETURN;
        END IF;

        EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', udt, 'INSUMO');
      END $$;
    `);
  }

  public async down(): Promise<void> {
    /* Postgres no permite quitar valores de un ENUM de forma portable. */
  }
}
