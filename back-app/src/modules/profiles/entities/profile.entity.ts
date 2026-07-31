import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  skills: string[];

  @Column({ type: 'text', nullable: true })
  experience: string | null;

  @Column({ type: 'text', nullable: true })
  education: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  desiredRole: string | null;

  @Column({ type: 'int', nullable: true })
  desiredSalary: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modality: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cvFilePath: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cvOriginalName: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
