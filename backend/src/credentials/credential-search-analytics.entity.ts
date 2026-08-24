import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('credential_search_analytics')
export class CredentialSearchAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  query: string;

  @Column({ type: 'json', nullable: true })
  filters: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  resultCount: number;

  @Column({ type: 'float', default: 0 })
  executionTimeMs: number;

  @CreateDateColumn()
  timestamp: Date;
}
