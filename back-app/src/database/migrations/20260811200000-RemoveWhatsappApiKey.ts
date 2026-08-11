import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWhatsappApiKey20260811200000 implements MigrationInterface {
  name = 'RemoveWhatsappApiKey20260811200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" DROP COLUMN "whatsappApiKey"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD "whatsappApiKey" character varying(100)`,
    );
  }
}
