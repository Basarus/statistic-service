import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessSnapshot1710000000001 implements MigrationInterface {
  name = 'AddBusinessSnapshot1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stat_business_snapshot (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_date date NOT NULL,
        organization_id bigint NOT NULL,
        metric_code varchar(120) NOT NULL,
        dimension_key varchar(120) NULL,
        value_total bigint NOT NULL,
        payload jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_stat_business_snapshot_org_metric_date ON stat_business_snapshot(organization_id, metric_code, snapshot_date)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_stat_business_snapshot_dimension ON stat_business_snapshot(dimension_key)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_business_snapshot_dimension');
    await queryRunner.query('DROP INDEX IF EXISTS idx_stat_business_snapshot_org_metric_date');
    await queryRunner.query('DROP TABLE IF EXISTS stat_business_snapshot');
  }
}
