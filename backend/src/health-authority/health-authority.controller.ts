import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HealthAuthorityService } from './health-authority.service';
import { ConnectAuthorityDto } from './dto/connect-authority.dto';
import { RequestCredentialDto } from './dto/request-credential.dto';
import { UpdateAuthorityDto } from './dto/update-authority.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/audit.decorator';
import { AuditOperation } from '../audit/audit-log.entity';

@Controller('health-authorities')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class HealthAuthorityController {
  constructor(private readonly healthAuthorityService: HealthAuthorityService) {}

  @Post('connect')
  @Audit(AuditOperation.CREATED)
  connect(@Body() dto: ConnectAuthorityDto) {
    return this.healthAuthorityService.connectAuthority(dto);
  }

  @Get()
  findAll() {
    return this.healthAuthorityService.findAll();
  }

  @Get('active')
  findActive() {
    return this.healthAuthorityService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.healthAuthorityService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAuthorityDto) {
    return this.healthAuthorityService.update(id, dto);
  }

  @Post(':id/verify')
  verify(@Param('id') id: string) {
    return this.healthAuthorityService.reconnect(id);
  }

  @Delete(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  disconnect(@Param('id') id: string) {
    return this.healthAuthorityService.disconnect(id);
  }

  @Post(':id/reconnect')
  reconnect(@Param('id') id: string) {
    return this.healthAuthorityService.reconnect(id);
  }

  @Post('credentials/request')
  @Audit(AuditOperation.CREATED)
  requestCredential(@Body() dto: RequestCredentialDto) {
    return this.healthAuthorityService.requestCredential(dto);
  }

  @Get('credentials/:id')
  checkIssuanceStatus(@Param('id') id: string) {
    return this.healthAuthorityService.checkIssuanceStatus(id);
  }

  @Get('credentials/wallet/:walletAddress')
  findIssuancesByWallet(@Param('walletAddress') walletAddress: string) {
    return this.healthAuthorityService.findIssuancesByWallet(walletAddress);
  }

  @Get('credentials/authority/:authorityId')
  findIssuancesByAuthority(@Param('authorityId') authorityId: string) {
    return this.healthAuthorityService.findIssuancesByAuthority(authorityId);
  }

  @Post('credentials/:id/retry')
  retryIssuance(@Param('id') id: string) {
    return this.healthAuthorityService.retryIssuance(id);
  }

  @Patch('credentials/:id/revoke')
  @Audit(AuditOperation.UPDATED)
  revokeIssuance(@Param('id') id: string) {
    return this.healthAuthorityService.revokeIssuance(id);
  }
}
