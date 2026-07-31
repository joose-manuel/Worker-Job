import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('worker_configs')
export class WorkerConfig {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'text', array: true, default: '{}' })
  keywords: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  portals: string[];

  @Column({ type: 'int', default: 60 })
  intervalMinutes: number;

  @Column({ type: 'int', nullable: true })
  minSalary: number | null;

  @Column({ type: 'int', default: 40 })
  minMatchPercent: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modality: string | null;

  @Column({ type: 'varchar', length: 100, default: 'llama-3.3-70b-versatile' })
  model: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'boolean', default: false })
  autoApply: boolean;

  @Column({ type: 'varchar', length: 30, nullable: true })
  whatsappPhone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  whatsappApiKey: string | null;

  @Column({ type: 'boolean', default: false })
  notifyWhatsapp: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
