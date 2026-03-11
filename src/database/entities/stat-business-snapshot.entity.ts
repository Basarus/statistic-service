import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'stat_business_snapshot' })
@Index('idx_stat_business_snapshot_org_metric_date', ['organizationId', 'metricCode', 'snapshotDate'])
@Index('idx_stat_business_snapshot_dimension', ['dimensionKey'])
export class StatBusinessSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', name: 'snapshot_date' })
  snapshotDate!: string;

  @Column({ type: 'bigint', name: 'organization_id' })
  organizationId!: number;

  @Column({ type: 'varchar', length: 120, name: 'metric_code' })
  metricCode!: string;

  @Column({ type: 'varchar', length: 120, name: 'dimension_key', nullable: true })
  dimensionKey!: string | null;

  @Column({ type: 'bigint', name: 'value_total' })
  valueTotal!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
