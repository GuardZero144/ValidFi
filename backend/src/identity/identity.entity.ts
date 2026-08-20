import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletAddress: string;

  @Column()
  documentHash: string;

  @Column()
  ipfsCid: string;

  @Column({ default: false })
  verificationStatus: boolean;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  revocationReason: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
