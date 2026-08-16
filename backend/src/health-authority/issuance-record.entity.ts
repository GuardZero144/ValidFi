import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HealthAuthority } from './health-authority.entity';

export enum IssuanceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  ISSUED = 'issued',
  FAILED = 'failed',
  REVOKED = 'revoked',
}

export enum CredentialFormat {
  W3C_VC = 'w3c_vc',
  FHIR = 'fhir',
  HL7 = 'hl7',
  CUSTOM_JSON = 'custom_json',
  SMART_HEALTH_CARD = 'smart_health_card',
}

@Entity('issuance_records')
export class IssuanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  authorityId: string;

  @ManyToOne(() => HealthAuthority)
  @JoinColumn({ name: 'authorityId' })
  authority: HealthAuthority;

  @Index()
  @Column()
  patientWalletAddress: string;

  @Column()
  credentialType: string;

  @Column({ type: 'enum', enum: CredentialFormat, default: CredentialFormat.CUSTOM_JSON })
  format: CredentialFormat;

  @Column({ type: 'enum', enum: IssuanceStatus, default: IssuanceStatus.PENDING })
  status: IssuanceStatus;

  @Column({ type: 'json' })
  healthData: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  issuedCredential: Record<string, any>;

  @Column({ nullable: true })
  credentialHash: string;

  @Column({ nullable: true })
  externalRequestId: string;

  @Column({ type: 'timestamptz', nullable: true })
  expirationDate: Date;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  issuerNotes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
