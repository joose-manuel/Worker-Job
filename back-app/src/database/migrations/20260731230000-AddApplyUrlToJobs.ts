import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplyUrlToJobs20260731230000 implements MigrationInterface {
  name = 'AddApplyUrlToJobs20260731230000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD "applyUrl" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "applyUrl"`);
  }
}
