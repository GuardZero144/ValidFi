import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  issuer: string;

  @Column({ nullable: true })
  holder: string;

  @Column({ type: 'json' })
  data: Record<string, any>;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  systemSource: string;

  @Index()
  @Column({ nullable: true })
  contentHash: string;

  @Column({ nullable: true })
  duplicateOfId: string;

  @Column({ default: false })
  isDuplicate: boolean;

  @Column({ type: 'json', nullable: true })
  duplicateMetadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
