import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastSeenAtToJobs20260801000000 implements MigrationInterface {
  name = 'AddLastSeenAtToJobs20260801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" ADD "lastSeenAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `UPDATE "jobs" SET "lastSeenAt" = "createdAt" WHERE "lastSeenAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "lastSeenAt"`);
  }
}
