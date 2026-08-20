import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { CredentialDeduplicationService } from './credential-deduplication.service';
import { Credential } from './credential.entity';

describe('CredentialDeduplicationService', () => {
  let service: CredentialDeduplicationService;
  let repository: jest.Mocked<Repository<Credential>>;

  const mockCredential: Credential = {
    id: 'test-uuid-1',
    type: 'Degree',
    issuer: 'University X',
    holder: 'wallet123',
    data: { GPA: 3.8, major: 'Computer Science' },
    status: 'active',
    systemSource: 'manual',
    contentHash: 'abc123hash',
    duplicateOfId: null,
    isDuplicate: false,
    duplicateMetadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialDeduplicationService,
        {
          provide: getRepositoryToken(Credential),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CredentialDeduplicationService>(CredentialDeduplicationService);
    repository = module.get(getRepositoryToken(Credential));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContentHash', () => {
    it('should generate a consistent hash for the same input', () => {
      const hash1 = service.generateContentHash('Degree', 'University X', 'wallet123', { GPA: 3.8 });
      const hash2 = service.generateContentHash('Degree', 'University X', 'wallet123', { GPA: 3.8 });
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = service.generateContentHash('Degree', 'University X', 'wallet123', { GPA: 3.8 });
      const hash2 = service.generateContentHash('Certificate', 'University X', 'wallet123', { GPA: 3.8 });
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize case and whitespace', () => {
      const hash1 = service.generateContentHash('Degree', 'University X', 'wallet123', { GPA: 3.8 });
      const hash2 = service.generateContentHash('  degree  ', '  university x  ', '  wallet123  ', { GPA: 3.8 });
      expect(hash1).toBe(hash2);
    });

    it('should handle null holder', () => {
      const hash1 = service.generateContentHash('Degree', 'University X', null, { GPA: 3.8 });
      const hash2 = service.generateContentHash('Degree', 'University X', null, { GPA: 3.8 });
      expect(hash1).toBe(hash2);
    });

    it('should sort object keys deterministically', () => {
      const hash1 = service.generateContentHash('Degree', 'University X', null, { b: 2, a: 1 });
      const hash2 = service.generateContentHash('Degree', 'University X', null, { a: 1, b: 2 });
      expect(hash1).toBe(hash2);
    });
  });

  describe('checkExactDuplicate', () => {
    it('should detect exact duplicate', async () => {
      repository.findOne.mockResolvedValue(mockCredential);

      const result = await service.checkExactDuplicate({
        type: 'Degree',
        issuer: 'University X',
        holder: 'wallet123',
        data: { GPA: 3.8, major: 'Computer Science' },
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingCredential).toEqual(mockCredential);
      expect(result.similarityScore).toBe(1.0);
    });

    it('should return no duplicate when none exists', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.checkExactDuplicate({
        type: 'Degree',
        issuer: 'University X',
        holder: 'wallet123',
        data: { GPA: 3.8 },
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.existingCredential).toBeUndefined();
    });
  });

  describe('checkSimilarCredentials', () => {
    it('should find similar credentials', async () => {
      repository.find.mockResolvedValue([mockCredential]);

      const result = await service.checkSimilarCredentials({
        type: 'Degree',
        issuer: 'University X',
        holder: 'wallet456',
        data: { GPA: 3.8, major: 'Computer Science' },
      }, 0.8);

      expect(result.length).toBe(1);
      expect(result[0].isDuplicate).toBe(true);
      expect(result[0].similarityScore).toBeGreaterThanOrEqual(0.8);
    });

    it('should not return credentials below similarity threshold', async () => {
      repository.find.mockResolvedValue([mockCredential]);

      const result = await service.checkSimilarCredentials({
        type: 'Degree',
        issuer: 'University X',
        data: { GPA: 2.0, major: 'Philosophy', year: 2024 },
      }, 0.8);

      expect(result.length).toBe(0);
    });
  });

  describe('checkForDuplicates', () => {
    it('should return exact match when found', async () => {
      repository.findOne.mockResolvedValue(mockCredential);

      const result = await service.checkForDuplicates({
        type: 'Degree',
        issuer: 'University X',
        holder: 'wallet123',
        data: { GPA: 3.8, major: 'Computer Science' },
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.similarityScore).toBe(1.0);
    });

    it('should check similar credentials when no exact match', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.find.mockResolvedValue([mockCredential]);

      const result = await service.checkForDuplicates({
        type: 'Degree',
        issuer: 'University X',
        data: { GPA: 3.8, major: 'Computer Science' },
      });

      expect(result.isDuplicate).toBe(true);
    });

    it('should return no duplicate when none found', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.find.mockResolvedValue([]);

      const result = await service.checkForDuplicates({
        type: 'Degree',
        issuer: 'University X',
        data: { GPA: 3.8 },
      });

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('uploadWithDeduplication', () => {
    it('should create new credential when no duplicate exists', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.find.mockResolvedValue([]);
      repository.create.mockReturnValue(mockCredential);
      repository.save.mockResolvedValue(mockCredential);

      const result = await service.uploadWithDeduplication({
        type: 'Degree',
        issuer: 'University X',
        holder: 'wallet123',
        data: { GPA: 3.8 },
      });

      expect(result.wasDuplicate).toBe(false);
      expect(result.action).toBe('created');
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for exact duplicates', async () => {
      repository.findOne.mockResolvedValue(mockCredential);

      await expect(
        service.uploadWithDeduplication({
          type: 'Degree',
          issuer: 'University X',
          holder: 'wallet123',
          data: { GPA: 3.8, major: 'Computer Science' },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should merge similar credentials', async () => {
      const similarCredential = {
        ...mockCredential,
        data: { GPA: 3.8, major: 'Computer Science', honors: true, year: 2024, semester: 'Fall' },
      };

      repository.findOne.mockResolvedValue(null);
      repository.find.mockResolvedValue([similarCredential]);
      repository.save.mockResolvedValue(similarCredential);

      const result = await service.uploadWithDeduplication({
        type: 'Degree',
        issuer: 'University X',
        data: { GPA: 3.8, major: 'Computer Science', honors: true, year: 2024, semester: 'Spring' },
      });

      expect(result.wasDuplicate).toBe(true);
      expect(result.action).toBe('merged');
    });
  });

  describe('preventDuplicateUpload', () => {
    it('should allow upload when no duplicate exists', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.preventDuplicateUpload({
        type: 'Degree',
        issuer: 'University X',
        data: { GPA: 3.8 },
      });

      expect(result.allowed).toBe(true);
    });

    it('should prevent upload when duplicate exists', async () => {
      repository.findOne.mockResolvedValue(mockCredential);

      const result = await service.preventDuplicateUpload({
        type: 'Degree',
        issuer: 'University X',
        data: { GPA: 3.8, major: 'Computer Science' },
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Exact duplicate exists');
      expect(result.existingId).toBe(mockCredential.id);
    });

    it('should reject upload with missing required fields', async () => {
      const result = await service.preventDuplicateUpload({
        type: 'Degree',
        issuer: 'University X',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Missing required fields for duplicate check');
    });
  });

  describe('markAsDuplicate', () => {
    it('should mark a credential as duplicate', async () => {
      repository.findOne.mockResolvedValue({ ...mockCredential });
      repository.save.mockImplementation(async (cred) => cred as Credential);

      const result = await service.markAsDuplicate('test-uuid-1', 'original-uuid');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOfId).toBe('original-uuid');
      expect(result.status).toBe('duplicate');
    });

    it('should throw error if credential not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.markAsDuplicate('nonexistent', 'original')).rejects.toThrow('Credential not found');
    });
  });

  describe('findDuplicatesOf', () => {
    it('should return all duplicates of a credential', async () => {
      const duplicates = [
        { ...mockCredential, id: 'dup-1', isDuplicate: true, duplicateOfId: 'original' },
        { ...mockCredential, id: 'dup-2', isDuplicate: true, duplicateOfId: 'original' },
      ];
      repository.find.mockResolvedValue(duplicates);

      const result = await service.findDuplicatesOf('original');

      expect(result.length).toBe(2);
      expect(repository.find).toHaveBeenCalledWith({
        where: { duplicateOfId: 'original', isDuplicate: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getDeduplicationStats', () => {
    it('should return correct statistics', async () => {
      repository.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(15);  // duplicates

      const stats = await service.getDeduplicationStats();

      expect(stats.totalCredentials).toBe(100);
      expect(stats.uniqueCredentials).toBe(85);
      expect(stats.duplicateCredentials).toBe(15);
      expect(stats.duplicateRate).toBe(0.15);
    });

    it('should handle zero credentials', async () => {
      repository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getDeduplicationStats();

      expect(stats.totalCredentials).toBe(0);
      expect(stats.duplicateRate).toBe(0);
    });
  });
});
