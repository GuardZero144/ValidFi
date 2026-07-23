import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Identity } from '../identity/identity.entity';
import { Verification, VerificationStatus } from '../verification/verification.entity';
import { SharedData } from '../data-sharing/data-sharing.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    @InjectRepository(SharedData)
    private readonly sharedDataRepository: Repository<SharedData>,
  ) {}

  async getDashboardMetrics() {
    const totalIdentities = await this.identityRepository.count();
    const activeIdentities = await this.identityRepository.count({ where: { revoked: false } });
    const revokedIdentities = await this.identityRepository.count({ where: { revoked: true } });

    const totalVerifications = await this.verificationRepository.count();
    const approvedVerifications = await this.verificationRepository.count({ where: { status: VerificationStatus.APPROVED } });
    const pendingVerifications = await this.verificationRepository.count({ where: { status: VerificationStatus.PENDING } });
    const rejectedVerifications = await this.verificationRepository.count({ where: { status: VerificationStatus.REJECTED } });

    const totalShares = await this.sharedDataRepository.count();
    const activeShares = await this.sharedDataRepository.count({ where: { isActive: true } });
    const expiredShares = await this.sharedDataRepository.count({ where: { isActive: false } });

    // Try to get some time-series data for the last 7 days of verifications
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentVerifications = await this.verificationRepository
      .createQueryBuilder('verification')
      .select("DATE(verification.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .where("verification.createdAt >= :date", { date: sevenDaysAgo })
      .groupBy("DATE(verification.createdAt)")
      .orderBy("DATE(verification.createdAt)", "ASC")
      .getRawMany();

    const formattedTrend = recentVerifications.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      count: parseInt(item.count, 10),
    }));

    return {
      usage: {
        totalIdentities,
        activeIdentities,
        revokedIdentities,
      },
      verificationRates: {
        total: totalVerifications,
        approved: approvedVerifications,
        pending: pendingVerifications,
        rejected: rejectedVerifications,
      },
      sharingPatterns: {
        total: totalShares,
        active: activeShares,
        expired: expiredShares,
      },
      verificationTrend: formattedTrend,
    };
  }
}
