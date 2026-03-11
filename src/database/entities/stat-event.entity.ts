import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'stat_event' })
@Index('uq_stat_event_event_uuid', ['eventUuid'], { unique: true })
@Index('idx_stat_event_occurred_at', ['occurredAt'])
@Index('idx_stat_event_organization_occurred_at', ['organizationId', 'occurredAt'])
@Index('idx_stat_event_event_name_occurred_at', ['eventName', 'occurredAt'])
@Index('idx_stat_event_platform_occurred_at', ['platform', 'occurredAt'])
@Index('idx_stat_event_auth_method_occurred_at', ['authMethod', 'occurredAt'])
@Index('idx_stat_event_user_occurred_at', ['userId', 'occurredAt'])
export class StatEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'event_uuid' })
  eventUuid!: string;

  @Column({ type: 'varchar', length: 150, name: 'event_name' })
  eventName!: string;

  @Column({ type: 'varchar', length: 100, name: 'event_category' })
  eventCategory!: string;

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt!: Date;

  @Column({ type: 'timestamptz', name: 'received_at' })
  receivedAt!: Date;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ type: 'smallint' })
  month!: number;

  @Column({ type: 'smallint' })
  day!: number;

  @Column({ type: 'smallint' })
  hour!: number;

  @Column({ type: 'bigint', name: 'organization_id' })
  organizationId!: number;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @Column({ type: 'uuid', name: 'account_id', nullable: true })
  accountId!: string | null;

  @Column({ type: 'uuid', name: 'personal_account_id', nullable: true })
  personalAccountId!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  platform!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'auth_method', nullable: true })
  authMethod!: string | null;

  @Column({ type: 'varchar', length: 50, name: 'request_type', nullable: true })
  requestType!: string | null;

  @Column({ type: 'bigint', name: 'provider_id', nullable: true })
  providerId!: number | null;

  @Column({ type: 'varchar', length: 50, name: 'service_type', nullable: true })
  serviceType!: string | null;

  @Column({ type: 'boolean', name: 'is_success' })
  isSuccess!: boolean;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 50, name: 'source_system' })
  sourceSystem!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
