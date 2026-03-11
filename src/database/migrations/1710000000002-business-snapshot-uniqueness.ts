import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessSnapshotUniqueness1710000000002 implements MigrationInterface {
  name = 'BusinessSnapshotUniqueness1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM stat_business_snapshot a
      USING stat_business_snapshot b
      WHERE a.id < b.id
        AND a.snapshot_date = b.snapshot_date
        AND a.organization_id = b.organization_id
        AND a.metric_code = b.metric_code
        AND COALESCE(a.dimension_key, '') = COALESCE(b.dimension_key, '')
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_stat_business_snapshot_period_dimension
      ON stat_business_snapshot(
        snapshot_date,
        organization_id,
        metric_code,
        COALESCE(dimension_key, '')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS uq_stat_business_snapshot_period_dimension');
  }
}
