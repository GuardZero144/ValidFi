import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AuthorityAuthType {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  MUTUAL_TLS = 'mutual_tls',
  JWT_BEARER = 'jwt_bearer',
}

export enum AuthorityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('health_authorities')
export class HealthAuthority {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column()
  apiUrl: string;

  @Column({ type: 'enum', enum: AuthorityAuthType })
  authType: AuthorityAuthType;

  @Column({ type: 'enum', enum: AuthorityStatus, default: AuthorityStatus.PENDING_VERIFICATION })
  status: AuthorityStatus;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true })
  clientSecret: string;

  @Column({ nullable: true })
  tokenUrl: string;

  @Column({ nullable: true })
  certificatePath: string;

  @Column({ nullable: true })
  jurisdiction: string;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ type: 'timestamptz', nullable: true })
  tokenExpiresAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: 0 })
  credentialsIssued: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastConnectedAt: Date;

  @Column({ nullable: true })
  lastError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
