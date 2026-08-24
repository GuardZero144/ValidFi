import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CredentialSearchAnalyticsService } from './credential-search-analytics.service';
import { CredentialSearchAnalytics } from './credential-search-analytics.entity';

describe('CredentialSearchAnalyticsService', () => {
  let service: any;

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((event) => Promise.resolve({ id: 'some-id', ...event })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialSearchAnalyticsService,
        {
          provide: getRepositoryToken(CredentialSearchAnalytics),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CredentialSearchAnalyticsService>(CredentialSearchAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log a search event', async () => {
    await service.logSearch('test query', { status: 'active' }, 5, 120);
    expect(mockRepository.create).toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
