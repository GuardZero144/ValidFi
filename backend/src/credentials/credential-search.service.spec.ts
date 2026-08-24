import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CredentialSearchService } from './credential-search.service';
import { Credential } from './credential.entity';
import { CredentialSearchAnalyticsService } from './credential-search-analytics.service';

describe('CredentialSearchService', () => {
  let service: any;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: '1' }], 1]),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockAnalyticsService = {
    logSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialSearchService,
        {
          provide: getRepositoryToken(Credential),
          useValue: mockRepository,
        },
        {
          provide: CredentialSearchAnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<CredentialSearchService>(CredentialSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should construct a query builder and apply filters', async () => {
    const filters = { status: 'active', customDataField: 'value' };
    const result = await service.search('query text', filters, 1, 10);

    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('credential');
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('to_tsvector'),
      { query: 'query text' }
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'credential.status = :status',
      { status: 'active' }
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'credential.data->>:key = :value',
      { key: 'customDataField', value: 'value' }
    );
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
    expect(mockAnalyticsService.logSearch).toHaveBeenCalled();
  });
});
