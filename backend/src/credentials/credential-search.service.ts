import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './credential.entity';
import { CredentialSearchAnalyticsService } from './credential-search-analytics.service';

export interface SearchFilters {
  status?: string;
  type?: string;
  issuer?: string;
  holder?: string;
  startDate?: Date;
  endDate?: Date;
  [key: string]: any; // Allow data JSON filters
}

export interface SearchResult {
  data: Credential[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CredentialSearchService {
  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
    private readonly analyticsService: CredentialSearchAnalyticsService,
  ) {}

  async search(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const queryBuilder = this.credentialRepository.createQueryBuilder('credential');

    if (query && query.trim() !== '') {
      // Use PostgreSQL full-text search across multiple columns
      // Note: simple concatenation with spaces for tsvector casting
      queryBuilder.andWhere(
        `to_tsvector('simple', coalesce(credential.type, '') || ' ' || coalesce(credential.issuer, '') || ' ' || coalesce(credential.holder, '')) @@ plainto_tsquery('simple', :query)`,
        { query }
      );
    }

    // Apply exact match standard filters
    if (filters.status) {
      queryBuilder.andWhere('credential.status = :status', { status: filters.status });
    }
    if (filters.type) {
      queryBuilder.andWhere('credential.type = :type', { type: filters.type });
    }
    if (filters.issuer) {
      queryBuilder.andWhere('credential.issuer = :issuer', { issuer: filters.issuer });
    }
    if (filters.holder) {
      queryBuilder.andWhere('credential.holder = :holder', { holder: filters.holder });
    }
    if (filters.startDate) {
      queryBuilder.andWhere('credential.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      queryBuilder.andWhere('credential.createdAt <= :endDate', { endDate: filters.endDate });
    }

    // Filter by JSON data if additional filters are provided
    Object.keys(filters).forEach((key) => {
      if (!['status', 'type', 'issuer', 'holder', 'startDate', 'endDate'].includes(key)) {
        queryBuilder.andWhere(`credential.data->>:key = :value`, {
          key,
          value: filters[key],
        });
      }
    });

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by created date descending by default
    queryBuilder.orderBy('credential.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();
    const executionTimeMs = Date.now() - startTime;

    // Fire off analytics logging asynchronously
    this.analyticsService.logSearch(query, filters, total, executionTimeMs);

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
