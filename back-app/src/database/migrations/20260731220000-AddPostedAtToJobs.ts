import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostedAtToJobs20260731220000 implements MigrationInterface {
  name = 'AddPostedAtToJobs20260731220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD "postedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "postedAt"`);
  }
}
