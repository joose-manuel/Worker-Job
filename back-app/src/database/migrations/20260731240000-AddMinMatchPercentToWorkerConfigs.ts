import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMinMatchPercentToWorkerConfigs20260731240000 implements MigrationInterface {
  name = 'AddMinMatchPercentToWorkerConfigs20260731240000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD "minMatchPercent" integer NOT NULL DEFAULT 40`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "worker_configs" DROP COLUMN "minMatchPercent"`);
  }
}
