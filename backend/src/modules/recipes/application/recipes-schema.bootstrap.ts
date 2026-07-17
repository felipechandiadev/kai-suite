import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Garantiza tablas de recetas/BOM cuando `DB_SYNCHRONIZE` está desactivado o el esquema no evolucionó.
 */
@Injectable()
export class RecipesSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(RecipesSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
DO $$
BEGIN
  CREATE TYPE recipes_type_enum AS ENUM ('SERVICE', 'PRODUCTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

      await this.dataSource.query(`
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "outputVariantId" uuid NOT NULL,
  type recipes_type_enum NOT NULL,
  version int NOT NULL DEFAULT 1,
  "isActive" boolean NOT NULL DEFAULT true,
  metadata json,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
`);

      await this.dataSource.query(`
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS company_id uuid;
`);

      await this.dataSource.query(`
CREATE INDEX IF NOT EXISTS idx_recipes_output_variant_active
ON recipes ("outputVariantId", "isActive");
`);

      await this.dataSource.query(`
CREATE TABLE IF NOT EXISTS recipe_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipeId" uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  "inputVariantId" uuid NOT NULL,
  "qtyPerOutputUnit" numeric(15,4) NOT NULL,
  "wasteFactor" numeric(8,4) NOT NULL DEFAULT 0,
  "sortOrder" int NOT NULL DEFAULT 1
);
`);

      await this.dataSource.query(`
ALTER TABLE recipe_lines ADD COLUMN IF NOT EXISTS company_id uuid;
`);

      await this.dataSource.query(`
CREATE INDEX IF NOT EXISTS idx_recipe_lines_recipe_id ON recipe_lines ("recipeId");
`);

      await this.dataSource.query(`
CREATE INDEX IF NOT EXISTS idx_recipe_lines_input_variant_id ON recipe_lines ("inputVariantId");
`);

      this.logger.log('Recipes / recipe_lines schema OK');
    } catch (err) {
      this.logger.error(
        `Recipes schema bootstrap failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
