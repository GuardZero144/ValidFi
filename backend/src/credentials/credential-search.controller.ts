import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CredentialSearchService, SearchFilters } from './credential-search.service';

@Controller('credentials/search')
export class CredentialSearchController {
  constructor(private readonly searchService: CredentialSearchService) {}

  @Get()
  async searchCredentials(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('issuer') issuer?: string,
    @Query('holder') holder?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    // Add additional queries by letting NestJS pass the rest as generic query object if needed
    // For now we extract the well known ones.
  ) {
    const filters: SearchFilters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (issuer) filters.issuer = issuer;
    if (holder) filters.holder = holder;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;

    return await this.searchService.search(query, filters, parsedPage, parsedLimit);
  }
}
