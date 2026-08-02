import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Crea `menu_hero_slides` en dev cuando la migración fue baselined sin ejecutar SQL. */
@Injectable()
export class MenuSchemaBootstrap implements OnModuleInit {
  private readonly logger = new Logger(MenuSchemaBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      const row = await this.dataSource.query<{ exists: boolean }[]>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'menu_hero_slides'
         ) AS exists`,
      );
      if (row?.[0]?.exists) {
        return;
      }

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "menu_hero_slides" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "company_id" uuid NOT NULL,
          "title" varchar(200),
          "subtitle" text,
          "cta_label" varchar(80),
          "cta_href" varchar(500),
          "cta_style" varchar(10) NOT NULL DEFAULT 'none',
          "is_active" boolean NOT NULL DEFAULT true,
          "sort_order" int NOT NULL DEFAULT 0,
          "text_align" varchar(10) NOT NULL DEFAULT 'left',
          "overlay_opacity" smallint NOT NULL DEFAULT 45,
          "text_color" varchar(7),
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_menu_hero_slides" PRIMARY KEY ("id")
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS "idx_menu_hero_slides_company_id"
        ON "menu_hero_slides" ("company_id")
      `);
      this.logger.log('menu_hero_slides table OK');
    } catch (err) {
      this.logger.error(
        `Menu schema bootstrap failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
