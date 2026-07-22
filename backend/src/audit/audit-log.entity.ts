import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Generated,
} from 'typeorm';

/**
 * The type of credential operation that produced an audit entry.
 */
export enum AuditOperation {
  ISSUED = 'issued',
  REVOKED = 'revoked',
  VERIFIED = 'verified',
  UPDATED = 'updated',
  DELETED = 'deleted',
  SHARED = 'shared',
  ACCESSED = 'accessed',
}

/**
 * Outcome of the audited operation.
 */
export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * Immutable, append-only record of a single credential operation.
 *
 * Integrity is guaranteed through HMAC hash-chaining: every entry stores the
 * `hash` of the previous entry in `previousHash`, and its own `hash` is an HMAC
 * computed over its canonical payload plus that `previousHash`. Any post-hoc
 * modification of a historical row breaks the chain and is detected by
 * {@link AuditService.verifyIntegrity}.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Monotonically increasing sequence number establishing a total order over
   * the chain. Used to link and verify entries deterministically.
   */
  @Index({ unique: true })
  @Generated('increment')
  @Column({ type: 'bigint' })
  sequence: string;

  /** Identifier of the actor performing the operation (e.g. wallet address). */
  @Index()
  @Column()
  actorId: string;

  @Index()
  @Column({ type: 'enum', enum: AuditOperation })
  operationType: AuditOperation;

  /** Identifier of the credential the operation targeted, when applicable. */
  @Index()
  @Column({ nullable: true })
  targetCredentialId: string | null;

  @Column({ nullable: true })
  clientIp: string | null;

  @Index()
  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.SUCCESS })
  status: AuditStatus;

  /** Non-sensitive JSON context describing the event. */
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  /** Hash of the preceding chain entry (null for the genesis entry). */
  @Column({ type: 'varchar', length: 64, nullable: true })
  previousHash: string | null;

  /** HMAC of this entry's canonical payload chained to `previousHash`. */
  @Column({ type: 'varchar', length: 64 })
  hash: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
