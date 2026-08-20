import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Credential } from './credential.entity';
import { CredentialDeduplicationService } from './credential-deduplication.service';

export interface MigrationPayload {
  sourceSystem: string;
  targetSystem: string;
  credentials: any[];
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  skippedDuplicates: number;
  message: string;
  errors?: any[];
}

@Injectable()
export class CredentialMigrationService {
  private readonly logger = new Logger(CredentialMigrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly deduplicationService: CredentialDeduplicationService,
  ) {}

  /**
   * Transforms raw credential data from a foreign system into our format.
   */
  private transformData(sourceSystem: string, rawData: any): Partial<Credential> {
    let type = rawData.type || 'Unknown';
    let issuer = rawData.issuer || 'Unknown';
    let data = rawData.data || rawData.attributes || {};
    let holder = rawData.holder || rawData.subject || null;

    if (sourceSystem === 'LegacyV1') {
      type = rawData.credentialType || type;
      issuer = rawData.issuedBy || issuer;
      data = rawData.payload || data;
    }

    return {
      type,
      issuer,
      holder,
      data,
      systemSource: sourceSystem,
      status: 'migrated',
    };
  }

  /**
   * Validates transformed credential to ensure integrity.
   */
  private validateData(transformed: Partial<Credential>): void {
    if (!transformed.type || transformed.type === 'Unknown' || !transformed.issuer || !transformed.data) {
      throw new Error(`Data integrity violation: Missing required fields for credential`);
    }
  }

  /**
   * Migrates a batch of credentials using a database transaction.
   * Includes duplicate detection: exact duplicates are skipped, similar credentials are merged.
   * Rolls back entirely if any non-duplicate credential fails transformation or validation.
   */
  async migrateCredentials(payload: MigrationPayload): Promise<MigrationResult> {
    this.logger.log(`Starting migration from ${payload.sourceSystem} to ${payload.targetSystem}`);
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    let migratedCount = 0;
    let skippedDuplicates = 0;
    const errors = [];

    try {
      for (const rawCred of payload.credentials) {
        try {
          const transformed = this.transformData(payload.sourceSystem, rawCred);
          this.validateData(transformed);

          const dupCheck = await this.deduplicationService.preventDuplicateUpload(transformed);

          if (!dupCheck.allowed) {
            this.logger.warn(`Skipping duplicate credential during migration: existing=${dupCheck.existingId}`);
            skippedDuplicates++;
            continue;
          }

          const contentHash = this.deduplicationService.generateContentHash(
            transformed.type,
            transformed.issuer,
            transformed.holder || null,
            transformed.data,
          );

          const credential = queryRunner.manager.create(Credential, {
            ...transformed,
            contentHash,
            isDuplicate: false,
          });
          await queryRunner.manager.save(credential);
          migratedCount++;
        } catch (err) {
          errors.push({ rawCred, error: err.message });
          throw err;
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Migration complete: migrated=${migratedCount}, skipped=${skippedDuplicates}`);

      return {
        success: true,
        migratedCount,
        failedCount: 0,
        skippedDuplicates,
        message: `Migration completed: ${migratedCount} migrated, ${skippedDuplicates} duplicates skipped`,
      };
    } catch (err) {
      this.logger.error(`Migration failed, rolling back. Error: ${err.message}`);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        migratedCount: 0,
        failedCount: payload.credentials.length,
        skippedDuplicates: 0,
        message: `Migration rolled back due to error: ${err.message}`,
        errors,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
