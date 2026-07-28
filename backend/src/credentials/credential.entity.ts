import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
