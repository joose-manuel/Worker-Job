import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsappColumns20260731210000 implements MigrationInterface {
  name = 'AddWhatsappColumns20260731210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD "whatsappPhone" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD "whatsappApiKey" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD "notifyWhatsapp" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" DROP COLUMN "notifyWhatsapp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_configs" DROP COLUMN "whatsappApiKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_configs" DROP COLUMN "whatsappPhone"`,
    );
  }
}
