import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { Verification } from './verification.entity';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';

describe('VerificationService', () => {
  let service: VerificationService;
  let repository: Repository<Verification>;

  const mockVerification: Verification = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    identityId: 'identity-123',
    verifierAddress: 'GVERIFY123...',
    status: 'pending',
    reason: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    repository = module.get<Repository<Verification>>(getRepositoryToken(Verification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a verification', async () => {
      const createDto: CreateVerificationDto = {
        identityId: 'identity-123',
        verifierAddress: 'GVERIFY123...',
        metadata: {},
      };

      mockRepository.create.mockReturnValue(mockVerification);
      mockRepository.save.mockResolvedValue(mockVerification);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockVerification);
      expect(result).toEqual(mockVerification);
    });
  });

  describe('findAll', () => {
    it('should return all verifications', async () => {
      const verifications = [mockVerification];
      mockRepository.find.mockResolvedValue(verifications);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toEqual(verifications);
    });
  });

  describe('findOne', () => {
    it('should return a verification by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockVerification);

      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
      expect(result).toEqual(mockVerification);
    });

    it('should throw NotFoundException when verification not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a verification', async () => {
      const updateDto: UpdateVerificationDto = {
        status: 'approved',
      };
      const updatedVerification = { ...mockVerification, status: 'approved' };

      mockRepository.findOne.mockResolvedValue(mockVerification);
      mockRepository.save.mockResolvedValue(updatedVerification);

      const result = await service.update('123e4567-e89b-12d3-a456-426614174000', updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toEqual('approved');
    });

    it('should throw NotFoundException when updating non-existent verification', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { status: 'approved' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a verification', async () => {
      const approvedVerification = { ...mockVerification, status: 'approved' };

      mockRepository.findOne.mockResolvedValue(mockVerification);
      mockRepository.save.mockResolvedValue(approvedVerification);

      const result = await service.approve('123e4567-e89b-12d3-a456-426614174000');

      expect(result.status).toBe('approved');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when approving non-existent verification', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.approve('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject a verification with reason', async () => {
      const rejectedVerification = {
        ...mockVerification,
        status: 'rejected',
        reason: 'Invalid documents',
      };

      mockRepository.findOne.mockResolvedValue(mockVerification);
      mockRepository.save.mockResolvedValue(rejectedVerification);

      const result = await service.reject('123e4567-e89b-12d3-a456-426614174000', 'Invalid documents');

      expect(result.status).toBe('rejected');
      expect(result.reason).toBe('Invalid documents');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rejecting non-existent verification', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reject('non-existent-id', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdentityId', () => {
    it('should return verifications by identity id', async () => {
      const verifications = [mockVerification];
      mockRepository.find.mockResolvedValue(verifications);

      const result = await service.findByIdentityId('identity-123');

      expect(repository.find).toHaveBeenCalledWith({
        where: { identityId: 'identity-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(verifications);
    });
  });
});
