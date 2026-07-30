import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxNonDeletable1740000000000 implements MigrationInterface {
  name = 'AddTaxNonDeletable1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "taxes" ADD COLUMN IF NOT EXISTS "nonDeletable" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "taxes" DROP COLUMN "nonDeletable"`);
  }
}
