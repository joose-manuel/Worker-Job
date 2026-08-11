import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWhatsappPhone20260811210000 implements MigrationInterface {
  name = 'RemoveWhatsappPhone20260811210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" DROP COLUMN "whatsappPhone"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD "whatsappPhone" character varying(30)`,
    );
  }
}
