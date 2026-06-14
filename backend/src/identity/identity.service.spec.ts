import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { Identity } from './identity.entity';
import { CreateIdentityDto } from './dto/create-identity.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';

describe('IdentityService', () => {
  let service: IdentityService;
  let repository: Repository<Identity>;

  const mockIdentity: Identity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    walletAddress: 'GABC123...',
    documentHash: 'QmHash123',
    metadata: { name: 'Test User' },
    revoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        {
          provide: getRepositoryToken(Identity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
    repository = module.get<Repository<Identity>>(getRepositoryToken(Identity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an identity', async () => {
      const createDto: CreateIdentityDto = {
        walletAddress: 'GABC123...',
        documentHash: 'QmHash123',
        metadata: { name: 'Test User' },
      };

      mockRepository.create.mockReturnValue(mockIdentity);
      mockRepository.save.mockResolvedValue(mockIdentity);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockIdentity);
      expect(result).toEqual(mockIdentity);
    });
  });

  describe('findAll', () => {
    it('should return all identities', async () => {
      const identities = [mockIdentity];
      mockRepository.find.mockResolvedValue(identities);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toEqual(identities);
    });

    it('should return identities filtered by wallet address', async () => {
      const identities = [mockIdentity];
      mockRepository.find.mockResolvedValue(identities);

      const result = await service.findAll('GABC123...');

      expect(repository.find).toHaveBeenCalledWith({
        where: { walletAddress: 'GABC123...' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(identities);
    });
  });

  describe('findOne', () => {
    it('should return an identity by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockIdentity);

      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      });
      expect(result).toEqual(mockIdentity);
    });

    it('should throw NotFoundException when identity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an identity', async () => {
      const updateDto: UpdateIdentityDto = {
        metadata: { name: 'Updated User' },
      };
      const updatedIdentity = { ...mockIdentity, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockIdentity);
      mockRepository.save.mockResolvedValue(updatedIdentity);

      const result = await service.update('123e4567-e89b-12d3-a456-426614174000', updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.metadata).toEqual(updateDto.metadata);
    });

    it('should throw NotFoundException when updating non-existent identity', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { metadata: {} }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('should revoke an identity', async () => {
      const revokedIdentity = { ...mockIdentity, revoked: true };

      mockRepository.findOne.mockResolvedValue(mockIdentity);
      mockRepository.save.mockResolvedValue(revokedIdentity);

      const result = await service.revoke('123e4567-e89b-12d3-a456-426614174000');

      expect(result.revoked).toBe(true);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when revoking non-existent identity', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.revoke('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an identity', async () => {
      mockRepository.findOne.mockResolvedValue(mockIdentity);
      mockRepository.remove.mockResolvedValue(mockIdentity);

      await service.remove('123e4567-e89b-12d3-a456-426614174000');

      expect(repository.remove).toHaveBeenCalledWith(mockIdentity);
    });

    it('should throw NotFoundException when removing non-existent identity', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByDocumentHash', () => {
    it('should return an identity by document hash', async () => {
      mockRepository.findOne.mockResolvedValue(mockIdentity);

      const result = await service.findByDocumentHash('QmHash123');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { documentHash: 'QmHash123' },
      });
      expect(result).toEqual(mockIdentity);
    });
  });
});
