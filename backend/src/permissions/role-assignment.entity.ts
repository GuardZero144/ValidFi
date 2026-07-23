import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CredentialRole, GLOBAL_SCOPE } from './permission.model';

/**
 * A single grant of a {@link CredentialRole} to a wallet.
 *
 * Assignments are scoped: `resourceId` is either a specific credential resource
 * id or {@link GLOBAL_SCOPE} (`*`) for a role that applies to every resource.
 * Grants are revoked by flipping `isActive` to false rather than deleting the
 * row, so the history of who held what remains queryable and auditable.
 */
@Entity('role_assignments')
@Index(['granteeAddress', 'resourceId', 'role'], { unique: true })
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Wallet the role is granted to. */
  @Index()
  @Column()
  granteeAddress: string;

  @Column({ type: 'enum', enum: CredentialRole })
  role: CredentialRole;

  /** Credential resource the role applies to, or `*` for all resources. */
  @Index()
  @Column({ default: GLOBAL_SCOPE })
  resourceId: string;

  /** Wallet that granted the role (for provenance and auditing). */
  @Column()
  grantedByAddress: string;

  @Column({ default: true })
  isActive: boolean;

  /** Optional expiry; `null` means the grant does not expire. */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  grantedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
