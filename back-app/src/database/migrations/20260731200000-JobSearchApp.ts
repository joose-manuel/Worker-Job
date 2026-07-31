import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSearchApp20260731200000 implements MigrationInterface {
  name = 'JobSearchApp20260731200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying(100) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "phone" character varying(20), "summary" text, "skills" text array NOT NULL DEFAULT '{}', "experience" text, "education" text, "location" character varying(100), "desiredRole" character varying(50), "desiredSalary" integer, "modality" character varying(50), "cvFilePath" character varying(255), "cvOriginalName" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_profiles_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_profiles_userId" ON "profiles" ("userId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "worker_configs" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "keywords" text array NOT NULL DEFAULT '{}', "portals" text array NOT NULL DEFAULT '{}', "intervalMinutes" integer NOT NULL DEFAULT 60, "minSalary" integer, "modality" character varying(50), "model" character varying(100) NOT NULL DEFAULT 'llama-3.3-70b-versatile', "enabled" boolean NOT NULL DEFAULT false, "autoApply" boolean NOT NULL DEFAULT false, "lastRunAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_worker_configs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_worker_configs_userId" ON "worker_configs" ("userId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "title" character varying(200) NOT NULL, "company" character varying(200), "location" character varying(100), "url" character varying(500), "description" text, "matchPercent" integer, "matchReason" text, "status" character varying(50) NOT NULL DEFAULT 'found', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_userId" ON "jobs" ("userId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "applications" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "jobId" integer, "status" character varying(50) NOT NULL DEFAULT 'applied', "interviewAt" TIMESTAMP WITH TIME ZONE, "notes" text, "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_applications_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_userId" ON "applications" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "worker_configs" ADD CONSTRAINT "FK_worker_configs_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_jobId" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TABLE "worker_configs"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
