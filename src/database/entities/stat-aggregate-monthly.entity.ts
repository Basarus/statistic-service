import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'stat_aggregate_monthly' })
@Unique('uq_stat_aggregate_monthly_dimensions', [
  'year',
  'month',
  'organizationId',
  'metricCode',
  'dimensionPlatform',
  'dimensionAuthMethod',
  'dimensionRequestType',
  'dimensionProviderId',
  'dimensionServiceType',
])
@Index('idx_stat_aggregate_monthly_ym', ['year', 'month'])
@Index('idx_stat_aggregate_monthly_org_ym', ['organizationId', 'year', 'month'])
@Index('idx_stat_aggregate_monthly_metric_ym', ['metricCode', 'year', 'month'])
export class StatAggregateMonthlyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ type: 'smallint' })
  month!: number;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 100, name: 'metric_code' })
  metricCode!: string;

  @Column({ type: 'varchar', length: 30, name: 'dimension_platform', nullable: true })
  dimensionPlatform!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'dimension_auth_method', nullable: true })
  dimensionAuthMethod!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'dimension_request_type', nullable: true })
  dimensionRequestType!: string | null;

  @Column({ type: 'uuid', name: 'dimension_provider_id', nullable: true })
  dimensionProviderId!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'dimension_service_type', nullable: true })
  dimensionServiceType!: string | null;

  @Column({ type: 'bigint', name: 'value_total', default: 0 })
  valueTotal!: string;

  @Column({ type: 'bigint', name: 'value_unique_users', default: 0 })
  valueUniqueUsers!: string;

  @Column({ type: 'bigint', name: 'value_unique_accounts', default: 0 })
  valueUniqueAccounts!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
