import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';

export type ApplicationStatus = 'applied' | 'interview' | 'rejected' | 'accepted';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column()
  userId: number;

  @ManyToOne(() => Job, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn()
  job: Job | null;

  @Column({ type: 'int', nullable: true })
  jobId: number | null;

  @Column({ type: 'varchar', length: 50, default: 'applied' })
  status: ApplicationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  interviewAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  appliedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
