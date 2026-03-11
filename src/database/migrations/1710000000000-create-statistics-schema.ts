import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStatisticsSchema1710000000000 implements MigrationInterface {
  name = 'CreateStatisticsSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_event (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_uuid uuid NOT NULL,
        event_name varchar(150) NOT NULL,
        event_category varchar(100) NOT NULL,
        occurred_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL,
        year smallint NOT NULL,
        month smallint NOT NULL,
        day smallint NOT NULL,
        hour smallint NOT NULL,
        organization_id uuid NOT NULL,
        user_id uuid NULL,
        account_id uuid NULL,
        personal_account_id uuid NULL,
        platform varchar(30) NULL,
        auth_method varchar(50) NULL,
        request_type varchar(50) NULL,
        provider_id uuid NULL,
        service_type varchar(50) NULL,
        is_success boolean NOT NULL,
        payload jsonb NOT NULL,
        source_system varchar(50) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_stat_event_event_uuid ON stat_event(event_uuid)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_event_occurred_at ON stat_event(occurred_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_event_organization_occurred_at ON stat_event(organization_id, occurred_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_event_event_name_occurred_at ON stat_event(event_name, occurred_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_event_platform_occurred_at ON stat_event(platform, occurred_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_event_auth_method_occurred_at ON stat_event(auth_method, occurred_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_event_user_occurred_at ON stat_event(user_id, occurred_at)');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_aggregate_daily (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        date date NOT NULL,
        organization_id uuid NOT NULL,
        metric_code varchar(100) NOT NULL,
        dimension_platform varchar(30) NULL,
        dimension_auth_method varchar(50) NULL,
        dimension_request_type varchar(50) NULL,
        dimension_provider_id uuid NULL,
        dimension_service_type varchar(50) NULL,
        value_total bigint NOT NULL DEFAULT 0,
        value_unique_users bigint NOT NULL DEFAULT 0,
        value_unique_accounts bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_stat_aggregate_daily_dimensions
      ON stat_aggregate_daily(
        date,
        organization_id,
        metric_code,
        coalesce(dimension_platform, ''),
        coalesce(dimension_auth_method, ''),
        coalesce(dimension_request_type, ''),
        coalesce(dimension_provider_id::text, ''),
        coalesce(dimension_service_type, '')
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_aggregate_daily_date ON stat_aggregate_daily(date)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_aggregate_daily_org_date ON stat_aggregate_daily(organization_id, date)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_aggregate_daily_metric_date ON stat_aggregate_daily(metric_code, date)');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_aggregate_monthly (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        year smallint NOT NULL,
        month smallint NOT NULL,
        organization_id uuid NOT NULL,
        metric_code varchar(100) NOT NULL,
        dimension_platform varchar(30) NULL,
        dimension_auth_method varchar(50) NULL,
        dimension_request_type varchar(50) NULL,
        dimension_provider_id uuid NULL,
        dimension_service_type varchar(50) NULL,
        value_total bigint NOT NULL DEFAULT 0,
        value_unique_users bigint NOT NULL DEFAULT 0,
        value_unique_accounts bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_stat_aggregate_monthly_dimensions
      ON stat_aggregate_monthly(
        year,
        month,
        organization_id,
        metric_code,
        coalesce(dimension_platform, ''),
        coalesce(dimension_auth_method, ''),
        coalesce(dimension_request_type, ''),
        coalesce(dimension_provider_id::text, ''),
        coalesce(dimension_service_type, '')
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_aggregate_monthly_ym ON stat_aggregate_monthly(year, month)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_aggregate_monthly_org_ym ON stat_aggregate_monthly(organization_id, year, month)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_stat_aggregate_monthly_metric_ym ON stat_aggregate_monthly(metric_code, year, month)');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_metric (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(100) NOT NULL,
        name varchar(255) NOT NULL,
        description text NULL,
        event_name varchar(150) NOT NULL,
        aggregation_type varchar(50) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_stat_metric_code ON stat_metric(code)');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_job_state (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        job_name varchar(100) NOT NULL,
        last_processed_at timestamptz NULL,
        last_processed_id uuid NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_stat_job_state_job_name ON stat_job_state(job_name)');

    await queryRunner.query(`
      INSERT INTO stat_metric (code, name, description, event_name, aggregation_type, is_active)
      VALUES
        ('login_success', 'Login success', 'Successful user logins', 'auth.login.success', 'count', true),
        ('login_success_web', 'Login success web', 'Successful user logins from web platform', 'auth.login.success', 'count', true),
        ('login_success_mobile', 'Login success mobile', 'Successful user logins from mobile platform', 'auth.login.success', 'count', true),
        ('login_by_auth_method', 'Login by auth method', 'Successful user logins grouped by auth method', 'auth.login.success', 'unique_users', true),
        ('payment_success', 'Payment success', 'Successful payments', 'payment.success', 'count', true),
        ('meter_reading_success', 'Meter reading success', 'Successful meter reading submissions', 'meter.reading.sent', 'count', true),
        ('receipt_download', 'Receipt download', 'Downloaded receipts', 'receipt.download', 'count', true),
        ('request_sent_lka', 'LKA request sent', 'Requests sent from LKA', 'request.sent', 'count', true),
        ('request_sent_provider', 'Provider request sent', 'Requests sent to provider systems', 'request.provider.sent', 'count', true)
      ON CONFLICT (code) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS uq_stat_job_state_job_name');
    await queryRunner.query('DROP TABLE IF EXISTS stat_job_state');

    await queryRunner.query('DROP INDEX IF EXISTS uq_stat_metric_code');
    await queryRunner.query('DROP TABLE IF EXISTS stat_metric');

    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_aggregate_monthly_metric_ym');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_aggregate_monthly_org_ym');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_aggregate_monthly_ym');
    await queryRunner.query('DROP INDEX IF EXISTS uq_stat_aggregate_monthly_dimensions');
    await queryRunner.query('DROP TABLE IF EXISTS stat_aggregate_monthly');

    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_aggregate_daily_metric_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_aggregate_daily_org_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_aggregate_daily_date');
    await queryRunner.query('DROP INDEX IF EXISTS uq_stat_aggregate_daily_dimensions');
    await queryRunner.query('DROP TABLE IF EXISTS stat_aggregate_daily');

    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_event_user_occurred_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_event_auth_method_occurred_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_event_platform_occurred_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_event_event_name_occurred_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_event_organization_occurred_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_event_occurred_at');
    await queryRunner.query('DROP INDEX IF EXISTS uq_stat_event_event_uuid');
    await queryRunner.query('DROP TABLE IF EXISTS stat_event');
  }
}
