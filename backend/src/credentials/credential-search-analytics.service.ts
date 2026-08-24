import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialSearchAnalytics } from './credential-search-analytics.entity';

@Injectable()
export class CredentialSearchAnalyticsService {
  private readonly logger = new Logger(CredentialSearchAnalyticsService.name);

  constructor(
    @InjectRepository(CredentialSearchAnalytics)
    private readonly analyticsRepository: Repository<CredentialSearchAnalytics>,
  ) {}

  async logSearch(
    query: string,
    filters: Record<string, any>,
    resultCount: number,
    executionTimeMs: number,
  ): Promise<void> {
    try {
      const logEntry = this.analyticsRepository.create({
        query,
        filters,
        resultCount,
        executionTimeMs,
      });
      // Fire and forget so we don't block the request
      this.analyticsRepository.save(logEntry).catch((err) => {
        this.logger.error(`Failed to save search analytics: ${err.message}`, err.stack);
      });
    } catch (error) {
      this.logger.error(`Error constructing search analytics log: ${error.message}`, error.stack);
    }
  }
}
