import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedData } from './data-sharing.entity';
import { CreateSharedDataDto } from './dto/create-shared-data.dto';
import { UpdateSharedDataDto } from './dto/update-shared-data.dto';

@Injectable()
export class DataSharingService {
  constructor(
    @InjectRepository(SharedData)
    private readonly sharedDataRepository: Repository<SharedData>,
  ) {}

  async create(createSharedDataDto: CreateSharedDataDto): Promise<SharedData> {
    const sharedData = this.sharedDataRepository.create(createSharedDataDto);
    return await this.sharedDataRepository.save(sharedData);
  }

  async findAll(): Promise<SharedData[]> {
    return await this.sharedDataRepository.find({ order: { sharedAt: 'DESC' } });
  }

  async findOne(id: string): Promise<SharedData> {
    const sharedData = await this.sharedDataRepository.findOne({ where: { id } });
    if (!sharedData) {
      throw new NotFoundException('Shared data not found');
    }
    return sharedData;
  }

  async update(id: string, updateSharedDataDto: UpdateSharedDataDto): Promise<SharedData> {
    const sharedData = await this.findOne(id);
    Object.assign(sharedData, updateSharedDataDto);
    return await this.sharedDataRepository.save(sharedData);
  }

  async revoke(id: string): Promise<SharedData> {
    const sharedData = await this.findOne(id);
    sharedData.isActive = false;
    return await this.sharedDataRepository.save(sharedData);
  }

  async isShareActive(id: string): Promise<boolean> {
    const sharedData = await this.findOne(id);
    if (!sharedData.isActive) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    return sharedData.accessExpiry > now;
  }

  async findByOwner(ownerAddress: string): Promise<SharedData[]> {
    return await this.sharedDataRepository.find({
      where: { ownerAddress },
      order: { sharedAt: 'DESC' },
    });
  }

  async findByRecipient(recipientAddress: string): Promise<SharedData[]> {
    return await this.sharedDataRepository.find({
      where: { recipientAddress },
      order: { sharedAt: 'DESC' },
    });
  }

  async extendShare(id: string, additionalSeconds: number): Promise<SharedData> {
    const sharedData = await this.findOne(id);
    sharedData.accessExpiry += additionalSeconds;
    return await this.sharedDataRepository.save(sharedData);
  }

  async findAllByOwner(ownerAddress: string): Promise<SharedData[]> {
    return await this.sharedDataRepository.find({
      where: { ownerAddress },
      order: { sharedAt: 'DESC' },
    });
  }

  async restore(data: Partial<SharedData>): Promise<SharedData> {
    const existing = await this.sharedDataRepository.findOne({
      where: { documentHash: data.documentHash, ownerAddress: data.ownerAddress },
    });

    if (existing) {
      Object.assign(existing, data);
      return await this.sharedDataRepository.save(existing);
    }

    const sharedData = this.sharedDataRepository.create(data);
    return await this.sharedDataRepository.save(sharedData);
  }
}
