import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { Identity } from './identity.entity';

import { AiModule } from '../ai/ai.module';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Identity]), AiModule, IpfsModule],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
