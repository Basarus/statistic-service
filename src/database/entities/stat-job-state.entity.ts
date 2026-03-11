import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'stat_job_state' })
@Unique('uq_stat_job_state_job_name', ['jobName'])
export class StatJobStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, name: 'job_name' })
  jobName!: string;

  @Column({ type: 'timestamptz', name: 'last_processed_at', nullable: true })
  lastProcessedAt!: Date | null;

  @Column({ type: 'uuid', name: 'last_processed_id', nullable: true })
  lastProcessedId!: string | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
