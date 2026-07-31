import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationsKeepOnJobDelete20260731220000 implements MigrationInterface {
  name = 'ApplicationsKeepOnJobDelete20260731220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_jobId"`);
    await queryRunner.query(`ALTER TABLE "applications" ALTER COLUMN "jobId" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_jobId"`);
    await queryRunner.query(`ALTER TABLE "applications" ALTER COLUMN "jobId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
