import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyUniqueDedupTables1710000000003 implements MigrationInterface {
  name = 'AddDailyUniqueDedupTables1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_aggregate_daily_unique_user (
        date date NOT NULL,
        organization_id bigint NOT NULL,
        metric_code varchar(100) NOT NULL,
        dimension_platform varchar(30) NULL,
        dimension_auth_method varchar(50) NULL,
        dimension_request_type varchar(50) NULL,
        dimension_provider_id bigint NULL,
        dimension_service_type varchar(50) NULL,
        user_id uuid NOT NULL,
        PRIMARY KEY (
          date,
          organization_id,
          metric_code,
          user_id,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_aggregate_daily_unique_account (
        date date NOT NULL,
        organization_id bigint NOT NULL,
        metric_code varchar(100) NOT NULL,
        dimension_platform varchar(30) NULL,
        dimension_auth_method varchar(50) NULL,
        dimension_request_type varchar(50) NULL,
        dimension_provider_id bigint NULL,
        dimension_service_type varchar(50) NULL,
        personal_account_id uuid NOT NULL,
        PRIMARY KEY (
          date,
          organization_id,
          metric_code,
          personal_account_id,
          dimension_platform,
          dimension_auth_method,
          dimension_request_type,
          dimension_provider_id,
          dimension_service_type
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS stat_aggregate_daily_unique_account');
    await queryRunner.query('DROP TABLE IF EXISTS stat_aggregate_daily_unique_user');
  }
}
